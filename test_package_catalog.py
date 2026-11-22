#!/usr/bin/env python3
"""Host-only packager tests. Git commits/tags exist only in disposable fixture repos.

No hooks, app builds, remote calls or device calls. Temporary repositories are
created below this repository's .tmp and cleaned after each test.
"""
import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("package_catalog", ROOT / "package-catalog.py")
pack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack)


class PackagingTests(unittest.TestCase):
    def setUp(self):
        temporary = ROOT / ".tmp"
        temporary.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix="packaging-tests-", dir=temporary)
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.addCleanup(patch.stopall)
        patch.object(pack, "ROOT", self.repo).start()
        self.write(".gitignore", ".tmp/\n")
        shutil.copy2(ROOT / "package-catalog.py", self.repo / "package-catalog.py")
        self.write("catalog.json", '{"historicalCatalog":"must not be reused or modified"}\n')
        self.write("release.json", '{"historicalRelease":"must not be assumed current"}\n')
        for plugin in ("animation-speed", "display-timeout", "miui-floating-windows"):
            self.write("plugins/" + plugin + "/plugin.json", '{"historical":true}\n')
            self.write("packages/" + plugin + ".zip", b"historical immutable bytes")
        self.populate()
        for plugin in pack.PACKAGE_FILES:
            data, _ = pack.package(plugin)
            self.write(str(pack.package_path(plugin)), data)
        self.git("init", "-q")
        self.git("add", ".")
        self.a = self.commit("Fixture source A")
        self.pin = {
            "repository": pack.REPOSITORY, "commit": self.a, "tag": "test-release-new",
            "assets": {p + ".zip": pack.sha256((self.repo / pack.package_path(p)).read_bytes())
                       for p in pack.PACKAGE_FILES},
        }
        self.pin_path = self.repo / ".tmp/new-release.json"
        self.save_pin()
        self.before = self.tree()

    def git(self, *args):
        return subprocess.check_output(["git", "-c", "user.name=Packaging tests",
            "-c", "user.email=packaging-tests@localhost", *args], cwd=self.repo, stderr=subprocess.PIPE)

    def commit(self, message):
        self.git("commit", "-qm", message)
        return self.git("rev-parse", "HEAD").decode().strip()

    def write(self, relative, data):
        target = self.repo / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data.encode() if isinstance(data, str) else data)
        return target

    def save_pin(self):
        self.write(".tmp/new-release.json", pack.encoded(self.pin))

    def tree(self):
        return {str(path.relative_to(self.repo)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in self.repo.rglob("*") if path.is_file() and
                not set(path.relative_to(self.repo).parts) & {".git", ".tmp"}}

    def populate(self):
        for filename in ("package-native.py", "native-candidates.json"):
            shutil.copy2(ROOT / filename, self.repo / filename)
        for plugin in pack.PACKAGE_FILES:
            shutil.copytree(ROOT / "plugins" / plugin, self.repo / "plugins" / plugin)

    def change_manifest(self, plugin, update):
        path = self.repo / "plugins" / plugin / "plugin.json"
        value = json.loads(path.read_text())
        update(value)
        path.write_bytes(pack.encoded(value))

    def cli(self, *args, ok=True):
        result = subprocess.run([sys.executable, "-B", "package-catalog.py", *map(str, args)],
                                cwd=self.repo, capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, ok, result.stdout + result.stderr)
        return result

    def test_deterministic_packages_exact_closure_and_metadata(self):
        expected = {
            "battery-charge-limit": {"plugin.json", "NOTICE.md", "native-charge"},
            "cpu-control": {"plugin.json", "native-power", "NOTICE.md"},
            "caffeine": {"plugin.json", "acquire.json", "release.json"},
            "miui-activity-retention": {"plugin.json", "hook.sh", "activity-lists.jar", "payload.sha256"},
        }
        self.assertEqual(set(pack.PACKAGE_FILES), set(expected))
        for plugin, names in expected.items():
            first, _ = pack.package(plugin)
            for name in names:
                os.utime(self.repo / "plugins" / plugin / name, (100, 100))
            second, _ = pack.package(plugin)
            self.assertEqual(first, second)
            with zipfile.ZipFile(io.BytesIO(first)) as archive:
                self.assertEqual(archive.namelist(), sorted(names))
                self.assertIsNone(archive.testzip())
                for member in archive.infolist():
                    native = plugin in pack.native.MEMBERS
                    self.assertEqual(member.date_time, (1980 if native else 2026, 1, 1, 0, 0, 0))
                    self.assertEqual(member.external_attr >> 16, 0o100755 if member.filename in ("native-power", "native-charge") else 0o100644)
                    self.assertEqual(member.compress_type, zipfile.ZIP_DEFLATED if native else zipfile.ZIP_STORED)
                    self.assertEqual(archive.read(member), (self.repo / "plugins" / plugin / member.filename).read_bytes())
        self.cli("packages", "--check")
        self.assertEqual(self.before, self.tree())

    def test_source_a_b_workflow_does_not_read_inherited_catalog_or_rewrite_assets(self):
        # A intentionally contains stale catalog/release documents. Neither is input.
        result = self.cli("build", "--release", self.pin_path, "--catalog", ".tmp/catalog-new.json")
        self.assertIn("PENDING:", result.stdout)
        catalog = json.loads((self.repo / ".tmp/catalog-new.json").read_text())
        self.assertEqual([x["release"]["asset"] for x in catalog["plugins"]],
                         ["battery-charge-limit.zip", "cpu-control.zip", "caffeine.zip", "miui-activity-retention.zip"])
        for entry in catalog["plugins"]:
            release = entry["release"]
            self.assertEqual(release["commit"], self.a)
            self.assertEqual(release["sha256"], self.pin["assets"][release["asset"]])
            manifest = json.loads((self.repo / release["manifestPath"]).read_bytes())
            self.assertEqual(release["asset"], manifest["id"] + ".zip")
            self.assertEqual(manifest["version"], "0.1.0")
        self.assertEqual(self.before, self.tree())
        self.cli("verify", "--release", self.pin_path, "--catalog", ".tmp/catalog-new.json")
        # Commit B changes only catalog/release metadata; source pin still targets A.
        self.write("catalog.json", (self.repo / ".tmp/catalog-new.json").read_bytes())
        self.write("releases/test-release-new.json", pack.encoded(self.pin))
        self.git("add", "catalog.json", "releases")
        self.assertNotEqual(self.commit("Fixture catalog B"), self.a)
        self.git("tag", "-a", self.pin["tag"], self.a, "-m", "Fixture tag")
        self.cli("verify", "--release", "releases/test-release-new.json", "--require-tag")
        self.assertEqual(json.loads((self.repo / "catalog.json").read_text()), catalog)

    def test_build_and_verify_require_explicit_release(self):
        for command in ("build", "verify"):
            result = self.cli(command, ok=False)
            self.assertIn("--release", result.stderr)
        self.assertEqual(self.before, self.tree())

    def test_mixed_release_asset_sets_retain_existing_pins(self):
        subsets = {
            "controls": ("battery-charge-limit.zip", "cpu-control.zip", "caffeine.zip"),
            "caffeine": ("caffeine.zip",),
            "retention": ("miui-activity-retention.zip",),
        }
        for tag, assets in subsets.items():
            pin = dict(self.pin, tag=tag, assets={asset: self.pin["assets"][asset] for asset in assets})
            self.write(f".tmp/{tag}.json", pack.encoded(pin))
            self.git("tag", tag, self.a)
        args = ("--release", ".tmp/retention.json", "--catalog", ".tmp/mixed.json", "--require-tag",
                "--retain", "battery-charge-limit=.tmp/controls.json",
                "--retain", "cpu-control=.tmp/controls.json", "--retain", "caffeine=.tmp/caffeine.json")
        self.cli("build", *args)
        catalog = json.loads((self.repo / ".tmp/mixed.json").read_text())
        self.assertEqual([entry["release"]["tag"] for entry in catalog["plugins"]],
                         ["controls", "controls", "caffeine", "retention"])
        self.cli("verify", *args)
        with self.assertRaisesRegex(ValueError, "asset set"):
            pack.release_pin(self.repo / ".tmp/caffeine.json", plugins=["cpu-control"], historical=True)
        self.assertEqual(self.before, self.tree())

    def test_retention_picker_toggle_hook_and_payload_are_checked(self):
        plugin = "miui-activity-retention"
        retention = {
            "id": "miui-activity-retention", "name": "MIUI window retention", "version": "0.1.0", "description": "Fixture",
            "backend": "root", "runtime": "shell",
            "hooks": dict.fromkeys(("enable", "disable"), "hook.sh"),
            "quickSettings": {"icon": "windows", "behavior": "toggle"},
            "ui": {"inputs": [{"id": "activities", "type": "activities", "label": "Apps", "default": ""}]},
        }
        self.write("plugins/miui-activity-retention/plugin.json", pack.encoded(retention))
        original = (self.repo / "plugins/miui-activity-retention/plugin.json").read_bytes()
        changes = [
            (lambda m: m["ui"]["inputs"][0].update(type="text"), "activities picker"),
            (lambda m: m["quickSettings"].update(icon="cpu"), "Quick Settings toggle"),
            (lambda m: m["hooks"].update(run="hook.sh"), "hook events"),
            (lambda m: m.update(triggers={"boot": True}), "explicit toggles"),
        ]
        for update, error in changes:
            with self.subTest(error=error):
                self.write(f"plugins/{plugin}/plugin.json", original)
                self.change_manifest(plugin, update)
                with self.assertRaisesRegex(ValueError, error):
                    pack.package(plugin)
        self.write(f"plugins/{plugin}/plugin.json", original)
        self.write(f"plugins/{plugin}/activity-lists.jar", b"changed")
        with self.assertRaisesRegex(ValueError, "JAR checksum"):
            pack.package(plugin)

    def test_universal_retention_manifest_authority(self):
        plugin = "miui-activity-retention"
        rel = Path("plugins", plugin, "plugin.json")
        self.write(rel, (ROOT / rel).read_bytes())
        data, _ = pack.package(plugin)
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            manifest = json.loads(archive.read("plugin.json"))
        self.assertFalse(manifest["ui"].get("inputs"))
        self.assertEqual(manifest["version"], "0.1.0")
        self.assertEqual(manifest["triggers"], {"boot": True, "intervalMinutes": 15})
        self.change_manifest(plugin, lambda value: value["triggers"].update(waitForRoot=True))
        with self.assertRaisesRegex(ValueError, "refresh triggers"):
            pack.package(plugin)

    def test_missing_helper_and_late_descriptor_failure_write_nothing(self):
        helper = self.repo / "plugins/battery-charge-limit/native-charge"
        original = helper.read_bytes()
        helper.unlink()
        self.cli("packages", "--package-dir", ".tmp/out", ok=False)
        self.assertFalse((self.repo / ".tmp/out").exists())
        helper.write_bytes(original)
        self.write("plugins/caffeine/release.json", '{"action":"keep-screen-on","operation":"acquire"}')
        self.cli("packages", "--package-dir", ".tmp/out", ok=False)
        self.assertFalse((self.repo / ".tmp/out").exists())
        for plugin in pack.PACKAGE_FILES:
            self.assertEqual(self.before[str(pack.package_path(plugin))],
                             pack.sha256((self.repo / pack.package_path(plugin)).read_bytes()))

    def test_new_unbundled_helper_and_dynamic_import_rejected(self):
        path = self.repo / "plugins/miui-activity-retention/hook.sh"
        for source in ('. "$INJECTOR_PLUGIN_DIR/missing.sh"\n', '. "$helper"\n'):
            with self.subTest(source=source):
                path.write_text(source)
                with self.assertRaisesRegex(ValueError, "dependency|dynamic"):
                    pack.package("miui-activity-retention")

    def test_battery_monitor_hash_checked(self):
        self.write("plugins/battery-charge-limit/native-charge", b"changed")
        with self.assertRaisesRegex(ValueError, "Worker"):
            pack.package("battery-charge-limit")

    def test_screen_off_choice_must_match_acquire(self):
        self.write("plugins/caffeine/acquire.json", pack.encoded({
            "action": "keep-screen-on", "operation": "acquire", "durationInput": "duration"}))
        with self.assertRaisesRegex(ValueError, "descriptor"):
            pack.package("caffeine")

    def test_native_descriptor_inputs_and_triggers_checked(self):
        original = (self.repo / "plugins/caffeine/plugin.json").read_bytes()
        changes = [
            lambda m: m.update(backend="root"),
            lambda m: m.update(triggers={"boot": True}),
            lambda m: m.update(triggers={"boot": 0}),
            lambda m: m["ui"]["inputs"][0].update(default="999999"),
            lambda m: m["ui"]["inputs"][0]["options"].append({"value": "999999", "label": "Forever"}),
            lambda m: m["hooks"].update(disable="acquire.json"),
        ]
        for update in changes:
            with self.subTest(update=update):
                self.write("plugins/caffeine/plugin.json", original)
                self.change_manifest("caffeine", update)
                with self.assertRaises(ValueError):
                    pack.package("caffeine")

    def test_missing_live_handler_rejected(self):
        for plugin in pack.WORKERS:
            self.change_manifest(plugin, lambda m: m["hooks"].pop("configure"))
            with self.subTest(plugin=plugin), self.assertRaisesRegex(ValueError, "hook events"):
                pack.package(plugin)

    def test_version_required_for_all_four_plugins(self):
        for plugin in pack.PACKAGE_FILES:
            self.change_manifest(plugin, lambda m: m.update(version="0.1"))
            with self.subTest(plugin=plugin), self.assertRaisesRegex(ValueError, "0.1.0"):
                pack.package(plugin)

    def test_release_pins_native_provenance_to_commit(self):
        metadata = self.repo / "native-candidates.json"
        value = json.loads(metadata.read_bytes())
        value["packages"]["cpu-control"]["worker"]["built_from_injector_commit"] = "0" * 40
        metadata.write_bytes(pack.encoded(value))
        with self.assertRaisesRegex(ValueError, "provenance differs"):
            pack.release_pin(self.pin_path)

    def test_rebuilt_workers_follow_new_candidate_provenance(self):
        metadata = self.repo / "native-candidates.json"
        provenance = json.loads(metadata.read_bytes())
        for plugin, name in pack.WORKERS.items():
            base = Path("plugins", plugin)
            src = base / "native/src/main.rs"
            source = (self.repo / src).read_bytes() + b"\n// fixture revision\n"
            self.write(src, source)
            # Distinct same-size fixture bytes preserve ELF headers and interpreter.
            worker = bytearray((self.repo / base / name).read_bytes())
            worker[-1] ^= 1
            self.write(base / name, worker)
            with self.assertRaises(ValueError):
                pack.package(plugin)
            record = provenance["packages"][plugin]
            record.update(source_repository="SmallThingz/injector-plugins", source_commit=self.a)
            record["source_files"][str(src)]["sha256"] = pack.sha256(source)
            notes = base / "native/README.md"
            self.write(notes, "Revision notes")
            record["source_files"][str(notes)] = {"sha256": pack.sha256(b"Revision notes")}
            record["worker"].update(built_from_plugins_commit=self.a, sha256=pack.sha256(worker))
            metadata.write_bytes(pack.encoded(provenance))
            data, _ = pack.package(plugin)
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                self.assertEqual(archive.read(name), bytes(worker))
            self.assertNotEqual(pack.sha256(data), self.pin["assets"][plugin + ".zip"])
        self.assertEqual(pack.sha256(pack.package("caffeine")[0]), self.pin["assets"]["caffeine.zip"])

    def test_source_and_worker_mapping(self):
        metadata = self.repo / "native-candidates.json"
        original = json.loads(metadata.read_bytes())
        for change in (
            lambda r: r["source_files"].pop("plugins/cpu-control/native/src/policy.rs"),
            lambda r: r["worker"].update(path="plugins/another/native-power"),
            lambda r: r["source_files"]["plugins/cpu-control/native/src/main.rs"].update(upstream_path="wrong"),
        ):
            record = copy.deepcopy(original)
            change(record["packages"]["cpu-control"])
            metadata.write_bytes(pack.encoded(record))
            with self.assertRaisesRegex(ValueError, "mapping"):
                pack.package("cpu-control")
        metadata.write_bytes(pack.encoded(original))
        self.write("plugins/cpu-control/native/src/main.rs", "// changed source")
        with self.assertRaisesRegex(ValueError, "Source differs"):
            pack.package("cpu-control")

    def test_only_git_subprocesses_used_to_build_catalog(self):
        commands = []
        run = subprocess.run

        def checked_run(command, *args, **kwargs):
            self.assertEqual("git", command[0])
            commands.append(command)
            return run(command, *args, **kwargs)

        with patch.object(subprocess, "run", checked_run):
            pack.main(["build", "--release", str(self.pin_path), "--catalog", str(self.repo / ".tmp/current.json")])
        self.assertTrue(commands)

    def test_pin_fields_and_unknown_assets_rejected(self):
        original = copy.deepcopy(self.pin)
        changes = [
            lambda p: p.update(commit=None),
            lambda p: p.update(commit=self.a[:12]),
            lambda p: p.update(repository="https://example.invalid/plugins"),
            lambda p: p.update(tag="bad..tag"),
            lambda p: p["assets"].update({"animation-speed.zip": "1" * 64}),
            lambda p: p["assets"].update({"cpu-control.zip": "NOT-SHA256"}),
            lambda p: p["assets"].pop("caffeine.zip"),
        ]
        for change in changes:
            with self.subTest(change=change):
                self.pin = copy.deepcopy(original)
                change(self.pin)
                self.save_pin()
                with self.assertRaises((ValueError, subprocess.CalledProcessError)):
                    pack.release_pin(self.pin_path)

    def test_duplicate_json_keys_rejected(self):
        path = self.repo / "plugins/caffeine/acquire.json"
        path.write_text('{"action":"wrong","action":"keep-screen-on","operation":"acquire","durationInput":"duration"}')
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            pack.package("caffeine")
        self.pin_path.write_text('{"commit":"one","commit":"two"}')
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            pack.release_pin(self.pin_path)

    def test_tampered_pin_hash_and_changed_working_source_rejected(self):
        self.pin["assets"]["cpu-control.zip"] = "0" * 64
        self.save_pin()
        with self.assertRaisesRegex(ValueError, "hash"):
            pack.release_pin(self.pin_path)
        self.pin["assets"]["cpu-control.zip"] = self.before["packages/cpu-control.zip"]
        self.save_pin()
        self.write("plugins/cpu-control/native-power", "# drift\n")
        with self.assertRaisesRegex(ValueError, "Working"):
            pack.release_pin(self.pin_path)

    def test_untracked_source_and_changed_nonpackaged_provenance_rejected(self):
        extra = self.write("plugins/cpu-control/new-helper.sh", "# absent from source A\n")
        with self.assertRaisesRegex(ValueError, "Uncommitted"):
            pack.release_pin(self.pin_path)
        extra.unlink()
        self.write("plugins/cpu-control/native/src/main.rs", "# changed provenance\n")
        with self.assertRaisesRegex(ValueError, "Working"):
            pack.release_pin(self.pin_path)

    def test_missing_and_wrong_tag_are_distinct(self):
        with self.assertRaisesRegex(ValueError, "missing locally"):
            pack.release_pin(self.pin_path, require_tag=True)
        self.write("unrelated.txt", "Different commit\n")
        self.git("add", "unrelated.txt")
        other = self.commit("Unrelated fixture revision")
        self.git("tag", self.pin["tag"], other)
        for required in (False, True):
            with self.assertRaisesRegex(ValueError, "does not resolve"):
                pack.release_pin(self.pin_path, require_tag=required)

    def test_matching_lightweight_tag_and_unrelated_worktree_change_allowed(self):
        self.git("tag", self.pin["tag"], self.a)
        self.write("unrelated.txt", "Another owner's uncommitted work\n")
        self.assertEqual(pack.release_pin(self.pin_path, require_tag=True), self.pin)
        self.assertEqual((self.repo / "unrelated.txt").read_text(), "Another owner's uncommitted work\n")

    def test_committed_bad_zip_cannot_be_blessed_by_matching_hash(self):
        self.write("packages/cpu-control.zip", b"bad archive with a correct SHA-256 pin")
        self.git("add", "packages/cpu-control.zip")
        self.pin["commit"] = self.commit("Fixture invalid archive")
        self.pin["assets"]["cpu-control.zip"] = pack.sha256((self.repo / "packages/cpu-control.zip").read_bytes())
        self.save_pin()
        with self.assertRaisesRegex(ValueError, "Rebuilt"):
            pack.release_pin(self.pin_path)

    def test_symlink_source_output_and_committed_blob_rejected(self):
        source = self.repo / "plugins/cpu-control/native-power"
        source.unlink()
        source.symlink_to("README.md")
        with self.assertRaisesRegex(ValueError, "Symlink"):
            pack.package("cpu-control")
        self.git("add", "plugins/cpu-control/native-power")
        bad = self.commit("Fixture symlink")
        with self.assertRaisesRegex(ValueError, "regular blob"):
            pack.committed_file(bad, Path("plugins/cpu-control/native-power"))
        output = self.repo / ".tmp/link"
        output.symlink_to(self.repo / "packages", target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "Symlink"):
            pack.output_path(output / "cpu-control.zip")

    def test_catalog_output_cannot_overwrite_pins_or_sources(self):
        for target in ("native-candidates.json", "miui-candidate-build.json", "release.json", "releases/new.json", "plugins/cpu-control/plugin.json",
                       "packages/manifest.json", ".git/evil.json", "../outside.json"):
            with self.subTest(target=target), self.assertRaises(ValueError):
                pack.output_path(self.repo / target, catalog=True)
        result = self.cli("build", "--release", ".tmp/sub/../new-release.json",
                          "--catalog", ".tmp/new-release.json", ok=False)
        # Ensure the alias exists, then exercise canonical-path collision itself.
        (self.repo / ".tmp/sub").mkdir()
        result = self.cli("build", "--release", ".tmp/sub/../new-release.json",
                          "--catalog", ".tmp/new-release.json", ok=False)
        self.assertIn("overwrite the release pin", result.stderr)
        self.assertEqual(json.loads(self.pin_path.read_text()), self.pin)

    def test_catalog_tampering_detected_and_verify_never_rewrites(self):
        self.cli("build", "--release", self.pin_path, "--catalog", ".tmp/catalog.json")
        path = self.repo / ".tmp/catalog.json"
        value = json.loads(path.read_text())
        value["plugins"][0]["release"]["commit"] = "f" * 40
        path.write_bytes(pack.encoded(value))
        before = path.read_bytes()
        self.cli("verify", "--release", self.pin_path, "--catalog", path, ok=False)
        self.assertEqual(path.read_bytes(), before)

    def test_explicit_source_tree_check_and_default_does_not_use_saved_candidate(self):
        # The explicit source option is read-only with --check. No .tmp candidate auto-discovery.
        source = self.repo / ".tmp/reviewed"
        shutil.copytree(self.repo / "plugins", source / "plugins")
        shutil.copy2(self.repo / "native-candidates.json", source)
        self.cli("packages", "--source-root", source, "--check")
        self.write("plugins/cpu-control/native-power", "# changed working source\n")
        self.cli("packages", "--check", ok=False)
        self.cli("packages", "--source-root", source, "--check")
        self.assertEqual(self.before["packages/cpu-control.zip"],
                         pack.sha256((self.repo / "packages/cpu-control.zip").read_bytes()))


if __name__ == "__main__":
    unittest.main()
