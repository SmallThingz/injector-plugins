"""Host fault tests for the real POSIX hooks, using a fake settings CLI (no device)."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

PLUGIN = Path(__file__).resolve().parent
SCRATCH = PLUGIN.parents[1] / ".tmp/postboot-plugins"
FAKE = r"""#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
root = Path(os.environ["FAKE_ROOT"])
db_path = root / "db.json"
db = json.loads(db_path.read_text())
args = sys.argv[1:]
assert args[0] == "--user", args
user, op, namespace = args[1:4]
key = args[4] if len(args) > 4 else ""
value = args[5] if len(args) > 5 else ""
with (root / "calls.jsonl").open("a") as stream:
    stream.write(json.dumps([user, op, namespace, key, value]) + "\n")
rules_path = root / "rules.json"
rules = json.loads(rules_path.read_text())
action = ""
for rule in rules:
    if rule.get("times", 1) == 0:
        continue
    if any(rule.get(k, v) != v for k, v in
           [("op", op), ("key", key), ("value", value)]):
        continue
    if rule.get("skip", 0):
        rule["skip"] -= 1
        break
    rule["times"] = rule.get("times", 1) - 1
    action = rule["action"]
    break
rules_path.write_text(json.dumps(rules))
if action in ("reject", "crash-before"):
    sys.exit(92 if action == "crash-before" else 1)
scope = namespace + "/" + user
entries = db.setdefault(scope, {})
if op == "list":
    if action == "diagnostic":
        print("Error while accessing settings provider", file=sys.stderr)
    elif action == "duplicate":
        print(key + "=1\n" + key + "=2")
    else:
        for k, v in entries.items():
            print(k + "=" + v)
elif op in ("put", "delete"):
    if op == "put":
        entries[key] = "0.33" if action == "clamp" else value
    else:
        entries.pop(key, None)
    db_path.write_text(json.dumps(db))
    if action == "unreadable":
        rules.append({"op": "list", "action": "reject", "times": 2})
        rules_path.write_text(json.dumps(rules))
    if action in ("lost-receipt", "crash-after"):
        sys.exit(91 if action == "crash-after" else 1)
else:
    raise AssertionError(args)
"""
HARNESS = r"""
mv() {
    if [ -n "${FAIL_MOVE_AT:-}" ]; then
        moves=0
        [ ! -f "$FAKE_ROOT/moves" ] || moves=$(cat "$FAKE_ROOT/moves")
        moves=$((moves + 1))
        printf '%s\n' "$moves" > "$FAKE_ROOT/moves"
        [ "$moves" != "$FAIL_MOVE_AT" ] || return 1
    fi
    command mv "$@"
}
settings() {
    receipt=0
    command "$FAKE_ROOT/bin/settings" "$@" || receipt=$?
    case "$receipt" in 91|92) exit "$receipt";; esac
    return "$receipt"
}
. "$INJECTOR_PLUGIN_DIR/hook.sh"
"""


class SettingsPluginTest(unittest.TestCase):
    def setUp(self):
        SCRATCH.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix="hooks-", dir=SCRATCH)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "bin").mkdir()
        self.state = self.root / "state"
        self.state.mkdir()
        self.journal = self.state / "settings-state"
        self.manifest = json.loads((PLUGIN / "plugin.json").read_text())
        self.animation = self.manifest["id"] == "animation-speed"
        self.keys = (["window_animation_scale", "transition_animation_scale",
                      "animator_duration_scale"] if self.animation else ["screen_off_timeout"])
        self.scope = "global/0" if self.animation else "system/10"
        self.inputs = (dict(window_percent="50", transition_percent="50", animator_percent="50")
                       if self.animation else dict(timeout_seconds="120"))
        self.target = "0.5" if self.animation else "120000"
        self.original = "1.00" if self.animation else "45000"
        self.db = self.root / "db.json"
        self.save({key: self.original for key in self.keys})
        (self.root / "rules.json").write_text("[]")
        (self.root / "current-user").write_text("10\n")
        fake = self.root / "bin/settings"
        fake.write_text(FAKE)
        fake.chmod(0o755)
        am = self.root / "bin/am"
        am.write_text('#!/bin/sh\n[ "$1" = get-current-user ] || exit 1\ncat "$FAKE_ROOT/current-user"\n')
        am.chmod(0o755)

    def save(self, values):
        self.db.write_text(json.dumps({self.scope: values}))

    def values(self):
        return json.loads(self.db.read_text()).get(self.scope, {})

    def fault(self, action, **match):
        path = self.root / "rules.json"
        rules = json.loads(path.read_text())
        rules.append(dict(action=action, **match))
        path.write_text(json.dumps(rules))

    def hook(self, event, code=0, fail_move_at=None, **inputs):
        env = dict(os.environ, PATH=str(self.root / "bin") + os.pathsep + os.environ["PATH"],
                   FAKE_ROOT=str(self.root), INJECTOR_PLUGIN_DIR=str(PLUGIN),
                   PLUGIN_STATE_DIR=str(self.state), INJECTOR_EVENT=event)
        env.update({"INJECTOR_INPUT_" + key: value for key, value in (self.inputs | inputs).items()})
        if fail_move_at is not None:
            env["FAIL_MOVE_AT"] = str(fail_move_at)
        result = subprocess.run(["sh", "-c", HARNESS], env=env, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        self.assertEqual(result.returncode, code, result.stdout)
        return result.stdout

    def writes(self):
        path = self.root / "calls.jsonl"
        return [call for call in map(json.loads, path.read_text().splitlines())
                if call[1] in ("put", "delete")] if path.exists() else []

    def assertOriginal(self):
        self.assertEqual(self.values(), {key: self.original for key in self.keys})

    def test_native_schema_and_package_contract(self):
        m = self.manifest
        self.assertEqual(m["backend"], "root")
        self.assertEqual(m["runtime"], "shell")
        self.assertEqual(m["triggers"], {"boot": True, "waitForRoot": True})
        self.assertEqual(set(m["hooks"]), {"enable", "disable", "run"})
        self.assertTrue(all((PLUGIN / h).is_file() for h in m["hooks"].values()))
        groups = {g["id"] for g in m["ui"]["groups"]}
        self.assertTrue(all(i["group"] in groups for i in m["ui"]["inputs"]))
        self.assertIn("presentation", m["ui"])
        self.assertNotIn("permissions", m)

    def test_run_and_boot_before_enable_do_nothing(self):
        self.hook("run")
        self.hook("boot")
        self.hook("disable")
        self.assertEqual(self.writes(), [])
        self.assertFalse(self.journal.exists())

    def test_repeated_enable_run_boot_and_disable_are_idempotent(self):
        self.hook("enable")
        first_writes = self.writes()
        self.hook("enable")
        self.hook("run")
        self.hook("boot")
        self.assertEqual(self.writes(), first_writes)
        self.hook("disable")
        self.assertOriginal()
        final_writes = self.writes()
        self.hook("disable")
        self.hook("run")
        self.hook("boot")
        self.assertEqual(self.writes(), final_writes)
        self.assertFalse(self.journal.exists())

    def test_absent_and_literal_null_are_distinct(self):
        for old in (None, "null", "", " 1.00 ", "$(touch forbidden)", "x=y"):
            with self.subTest(old=old):
                self.save({} if old is None else {key: old for key in self.keys})
                self.hook("enable")
                self.hook("disable")
                self.assertEqual(self.values(), {} if old is None else
                                 {key: old for key in self.keys})

    def test_original_survives_configuration_changes(self):
        self.hook("enable")
        changed = (dict(window_percent="25", transition_percent="75", animator_percent="200")
                   if self.animation else dict(timeout_seconds="600"))
        self.hook("run", **changed)
        expected = dict(zip(self.keys, ["0.25", "0.75", "2"])) if self.animation else {self.keys[0]: "600000"}
        self.assertEqual(self.values(), expected)
        self.hook("disable")
        self.assertOriginal()

    def test_disable_ignores_invalid_drafts(self):
        self.hook("enable")
        self.hook("disable", **{key: "invalid" for key in self.inputs}, reapply_on_boot="bad")
        self.assertOriginal()

    def test_invalid_enable_makes_no_writes(self):
        self.hook("enable", code=1, **{key: "invalid" for key in self.inputs})
        self.assertEqual(self.writes(), [])
        self.assertFalse(self.journal.exists())

    def test_boot_preference_and_reapply_after_reset_to_original(self):
        self.hook("enable")
        self.save({key: self.original for key in self.keys})
        previous = self.writes()
        self.hook("boot", reapply_on_boot="false")
        self.assertEqual(self.writes(), previous)
        self.assertOriginal()
        self.hook("boot", reapply_on_boot="true")
        self.assertEqual(self.values(), {key: self.target for key in self.keys})
        self.hook("disable")
        self.assertOriginal()

    def test_external_change_is_preserved_on_run_and_disable(self):
        self.hook("enable")
        values = self.values()
        values[self.keys[0]] = "external"
        self.save(values)
        previous = self.writes()
        self.hook("run", code=1)
        self.assertEqual(self.writes(), previous)
        self.assertIn("Preserved external change", self.hook("disable"))
        expected = {key: self.original for key in self.keys}
        expected[self.keys[0]] = "external"
        self.assertEqual(self.values(), expected)
        self.assertFalse(self.journal.exists())

    def test_external_deletion_is_preserved(self):
        self.hook("enable")
        values = self.values()
        del values[self.keys[0]]
        self.save(values)
        self.hook("disable")
        self.assertNotIn(self.keys[0], self.values())

    def test_lost_write_receipt_uses_readback(self):
        self.fault("lost-receipt", op="put", times=len(self.keys))
        self.hook("enable")
        self.assertEqual(self.values(), {key: self.target for key in self.keys})
        self.fault("lost-receipt", op="put", times=len(self.keys))
        self.hook("disable")
        self.assertOriginal()

    def test_failed_apply_rolls_back_and_retries(self):
        self.fault("reject", op="put", key=self.keys[-1])
        self.hook("enable", code=1)
        self.assertOriginal()
        self.assertFalse(self.journal.exists())
        self.hook("enable")
        self.hook("disable")
        self.assertOriginal()

    def test_failed_reconfiguration_restores_previous_applied_values(self):
        self.hook("enable")
        self.fault("reject", op="put", key=self.keys[-1])
        changed = ({key: "25" for key in self.inputs} if self.animation else dict(timeout_seconds="300"))
        self.hook("run", code=1, **changed)
        self.assertEqual(self.values(), {key: self.target for key in self.keys})
        self.hook("run", **changed)
        self.hook("disable")
        self.assertOriginal()

    def test_crash_before_and_after_write_enable_retry(self):
        for action, code in (("crash-before", 92), ("crash-after", 91)):
            with self.subTest(action=action):
                self.fault(action, op="put", key=self.keys[-1])
                self.hook("enable", code=code)
                self.assertTrue(self.journal.exists())
                self.hook("enable")
                self.assertEqual(self.values(), {key: self.target for key in self.keys})
                self.hook("disable")
                self.assertOriginal()

    def test_crash_then_run_recovers_without_enabling(self):
        self.fault("crash-after", op="put")
        self.hook("enable", code=91)
        self.hook("run")
        self.assertOriginal()
        self.assertFalse(self.journal.exists())

    def test_crash_then_disable_restores_directly(self):
        self.fault("crash-after", op="put", key=self.keys[-1])
        self.hook("enable", code=91)
        self.hook("disable")
        self.assertOriginal()

    def test_restore_failure_retains_state_for_disable_retry(self):
        self.hook("enable")
        self.fault("reject", op="put", key=self.keys[-1], value=self.original)
        self.hook("disable", code=1)
        self.assertTrue(self.journal.exists())
        self.hook("disable")
        self.assertOriginal()
        self.assertFalse(self.journal.exists())

    def test_unknown_restore_receipt_retry(self):
        self.hook("enable")
        self.fault("crash-after", op="put", key=self.keys[-1], value=self.original)
        self.hook("disable", code=91)
        previous = self.writes()
        self.hook("disable")
        self.assertOriginal()
        self.assertEqual(self.writes(), previous)

    def test_absent_restore_delete_failure_retry(self):
        self.save({})
        self.hook("enable")
        self.fault("reject", op="delete", key=self.keys[-1])
        self.hook("disable", code=1)
        self.assertTrue(self.journal.exists())
        self.hook("disable")
        self.assertEqual(self.values(), {})

    def test_read_failure_never_means_absent(self):
        self.fault("reject", op="list")
        self.hook("enable", code=1)
        self.assertEqual(self.writes(), [])
        self.assertOriginal()

    def test_zero_exit_diagnostic_is_not_absence(self):
        self.fault("diagnostic", op="list")
        self.hook("enable", code=1)
        self.assertEqual(self.writes(), [])
        self.assertFalse(self.journal.exists())

    def test_failed_intent_persistence_prevents_write(self):
        self.hook("enable", code=1, fail_move_at=3)
        self.assertEqual(self.writes(), [])
        self.hook("enable")
        self.hook("disable")
        self.assertOriginal()

    def test_failed_commit_persistence_remains_recoverable(self):
        self.hook("enable", code=1, fail_move_at=len(self.keys) + 3)
        self.assertEqual(self.values(), {key: self.target for key in self.keys})
        self.hook("enable")
        self.hook("disable")
        self.assertOriginal()

    def test_unattempted_target_is_not_owned_after_crash(self):
        if not self.animation:
            self.skipTest("Multiple settings are required for an unattempted target")
        self.fault("crash-after", op="put", key=self.keys[0])
        self.hook("enable", code=91)
        values = self.values()
        values[self.keys[-1]] = self.target
        self.save(values)
        self.hook("disable")
        expected = {key: self.original for key in self.keys}
        expected[self.keys[-1]] = self.target
        self.assertEqual(self.values(), expected)

    def test_each_declared_value_is_accepted(self):
        control = self.manifest["ui"]["inputs"][0]
        values = ([str(n) for n in range(0, 201, 25)] if self.animation else
                  [option["value"] for option in control["options"]])
        self.hook("enable")
        for value in values:
            inputs = ({key: value for key in self.inputs} if self.animation else
                      {control["id"]: value})
            self.hook("run", **inputs)
            expected = str(float(value) / 100).rstrip("0").rstrip(".") if self.animation else str(int(value) * 1000)
            self.assertEqual(self.values(), {key: expected for key in self.keys})
        self.hook("disable")
        self.assertOriginal()

    def test_unknown_readback_keeps_recovery_state(self):
        self.fault("unreadable", op="put", key=self.keys[-1])
        self.hook("enable", code=1)
        self.assertTrue(self.journal.exists())
        self.hook("enable")
        self.hook("disable")
        self.assertOriginal()

    def test_clamped_value_is_not_claimed_as_owned(self):
        self.fault("clamp", op="put", key=self.keys[-1])
        self.hook("enable", code=1)
        self.assertTrue(self.journal.exists())
        self.assertEqual(self.values()[self.keys[-1]], "0.33")
        self.hook("enable", code=1)
        self.hook("disable")
        expected = {key: self.original for key in self.keys}
        expected[self.keys[-1]] = "0.33"
        self.assertEqual(self.values(), expected)

    def test_corrupt_journal_fails_closed(self):
        self.hook("enable")
        previous = self.writes()
        self.journal.write_text("not a valid journal\n")
        self.hook("disable", code=1)
        self.hook("enable", code=1)
        self.assertEqual(self.writes(), previous)

    def test_user_is_pinned(self):
        self.hook("enable")
        (self.root / "current-user").write_text("11\n")
        self.hook("run")
        self.hook("disable")
        self.assertOriginal()
        self.assertTrue(all(call[0] == ("0" if self.animation else "10") for call in self.writes()))

    def test_rollback_failure_retains_original_for_retry(self):
        if not self.animation:
            self.skipTest("Multiple settings are required for partial-apply rollback")
        self.fault("reject", op="put", key=self.keys[-1])
        self.fault("reject", op="put", key=self.keys[0], value=self.original)
        self.hook("enable", code=1)
        self.assertTrue(self.journal.exists())
        self.hook("enable")
        self.hook("disable")
        self.assertOriginal()


if __name__ == "__main__":
    unittest.main(verbosity=2)
