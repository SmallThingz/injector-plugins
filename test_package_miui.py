#!/usr/bin/env python3
"""Qualify current MIUI sources and the separate frozen artifact; never rewrite either."""
import importlib.util
import io
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch
import zipfile
ROOT = Path(__file__).resolve().parent
FROZEN_ARTIFACT_COMMIT = "72ff6bd0a57b8b0cccee7feb0e63a431d4a0cdba"
spec = importlib.util.spec_from_file_location("package_catalog", ROOT / "package-catalog.py")
pack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack)


class CurrentMiuiPackagingTests(unittest.TestCase):
    def test_current_source_candidate_predecessor_payload_and_repeatable_archive(self):
        plugin = "miui-activity-retention"
        members = {name: (ROOT / "plugins" / plugin / name).read_bytes()
                   for name in pack.PACKAGE_FILES[plugin]}
        manifest = pack.validate_manifest(plugin, members)
        self.assertEqual(manifest["version"], "0.1.0")
        self.assertEqual(manifest["ui"]["layout"], "accordion")
        self.assertTrue(manifest["ui"]["presentation"]["description"].strip())
        self.assertEqual(manifest["liveUpdate"]["fromSha256"],
                         "87979a98f29946e12a665f431ecffda28ea3ccfbb4ba766b01dba160f36cd197")
        data, _ = pack.package(plugin)
        self.assertEqual(data, pack.package(plugin)[0])
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            self.assertEqual(set(archive.namelist()), set(members))
            for name, content in members.items():
                self.assertEqual(archive.read(name), content)
        manifest["liveUpdate"]["fromSha256"] = "0" * 64
        with self.assertRaises(ValueError):
            pack.validate_manifest(plugin, dict(members, **{"plugin.json": pack.encoded(manifest)}))
        with self.assertRaises(ValueError):
            pack.validate_manifest(plugin, dict(members, **{"activity-lists.jar": b"wrong payload"}))

    def test_package_events_require_recovery_predecessor_and_identical_controller(self):
        plugin = "miui-activity-retention"
        previous_commit = "e17de5d108d87b4a84289988c430a1d8f523b416"
        previous = pack.committed_file(previous_commit, pack.package_path(plugin))
        event_commit = "1fa871e327e2167d0017a0a40f0bfb275befd861"
        data = pack.committed_file(event_commit, pack.package_path(plugin))
        self.assertEqual(pack.sha256(data), "87979a98f29946e12a665f431ecffda28ea3ccfbb4ba766b01dba160f36cd197")
        current, _ = pack.package(plugin)
        with zipfile.ZipFile(io.BytesIO(current)) as diagnostic, zipfile.ZipFile(io.BytesIO(data)) as event:
            self.assertEqual(set(diagnostic.namelist()), set(event.namelist()))
            changed = {name for name in event.namelist() if diagnostic.read(name) != event.read(name)}
            self.assertEqual(changed, {"plugin.json", "activity-lists.jar", "payload.sha256"})
            expected_manifest = json.loads(event.read("plugin.json"))
            expected_manifest["liveUpdate"]["fromSha256"] = pack.sha256(data)
            self.assertEqual(expected_manifest, json.loads(diagnostic.read("plugin.json")))
        with zipfile.ZipFile(io.BytesIO(previous)) as old, zipfile.ZipFile(io.BytesIO(data)) as new:
            self.assertEqual(set(old.namelist()), set(new.namelist()))
            members = {name: new.read(name) for name in new.namelist()}
            for name in members.keys() - {"plugin.json"}:
                self.assertEqual(old.read(name), members[name], name)
            original = json.loads(old.read("plugin.json"))
        self.assertEqual(pack.sha256(previous), "e19493882831da15dbb03bb9219bb41c07c1a9202d5ea23ffcdc1b2f3255f10e")
        manifest = json.loads(members["plugin.json"])
        self.assertIs(manifest["triggers"].pop("packageChanges"), True)
        self.assertEqual(original, manifest)
        for unsupported in (False, 1, "true", None):
            manifest["triggers"]["packageChanges"] = unsupported
            with self.subTest(value=unsupported), self.assertRaisesRegex(ValueError, "refresh triggers"):
                pack.validate_manifest(plugin, dict(members, **{"plugin.json": pack.encoded(manifest)}))

    def test_frozen_artifact_matches_its_recorded_source_and_archive_identity(self):
        record = json.loads(pack.committed_file(FROZEN_ARTIFACT_COMMIT, Path("miui-candidate-build.json")))
        source = record["integration_source_commit"]
        for path, digest in record["source_files"].items():
            self.assertEqual(digest, pack.sha256(pack.committed_file(source, Path(path))), path)
        frozen = pack.committed_file(FROZEN_ARTIFACT_COMMIT, Path("packages/miui-activity-retention.zip"))
        self.assertEqual(record["zip_sha256"], pack.sha256(frozen))
        self.assertEqual(record["zip_bytes"], len(frozen))
        with zipfile.ZipFile(io.BytesIO(frozen)) as archive:
            self.assertEqual(pack.committed_file(source, Path(record["manifest_path"])), archive.read("plugin.json"))
            self.assertEqual(record["jar_sha256"], pack.sha256(archive.read("activity-lists.jar")))
            current_manifest = (ROOT / record["manifest_path"]).read_bytes()
            if current_manifest != archive.read("plugin.json"):
                self.assertNotEqual(frozen, pack.package("miui-activity-retention")[0])

    @unittest.skipUnless(os.environ.get("MIUI_CURRENT_CANDIDATE"), "Set MIUI_CURRENT_CANDIDATE to verify an explicit candidate and its artifact.json")
    def test_explicit_current_candidate_matches_sources_and_its_own_receipt(self):
        candidate = Path(os.environ["MIUI_CURRENT_CANDIDATE"])
        data = candidate.read_bytes()
        record = json.loads(candidate.with_name("artifact.json").read_bytes())
        self.assert_current_candidate(data, record)

    def assert_current_candidate(self, data, record):
        self.assertEqual(pack.package("miui-activity-retention")[0], data)
        self.assertEqual(pack.sha256(data), record["sha256"])
        self.assertEqual(len(data), record["bytes"])
        frozen = pack.committed_file(FROZEN_ARTIFACT_COMMIT, Path("packages/miui-activity-retention.zip"))
        with zipfile.ZipFile(io.BytesIO(data)) as archive, zipfile.ZipFile(io.BytesIO(frozen)) as old:
            for name in pack.PACKAGE_FILES["miui-activity-retention"]:
                self.assertEqual(pack.committed_file(record["commit"], Path("plugins/miui-activity-retention") / name), archive.read(name))
            controller_unchanged = archive.read("activity-lists.jar") == old.read("activity-lists.jar")
            manifest = json.loads(archive.read("plugin.json"))
        self.assertEqual("0.1.0", manifest["version"])
        self.assertEqual(manifest["version"], record["version"])
        self.assertEqual(manifest["ui"]["layout"], record["layout"])
        self.assertIs(record["controller_payload_unchanged"], controller_unchanged)

    def test_current_candidate_controller_claim_matches_payload_and_commit(self):
        frozen = pack.committed_file(FROZEN_ARTIFACT_COMMIT, Path("packages/miui-activity-retention.zip"))
        with zipfile.ZipFile(io.BytesIO(frozen)) as old:
            frozen_jar = old.read("activity-lists.jar")
        for changed in (False, True):
            with self.subTest(controller_changed=changed):
                members = {name: (ROOT / "plugins/miui-activity-retention" / name).read_bytes()
                           for name in pack.PACKAGE_FILES["miui-activity-retention"]}
                members["activity-lists.jar"] = frozen_jar + (b"rebuilt test fixture" if changed else b"")
                members["payload.sha256"] = (pack.sha256(members["activity-lists.jar"]) + "  activity-lists.jar\n").encode()
                stream = io.BytesIO()
                with zipfile.ZipFile(stream, "w") as archive:
                    for name, content in members.items():
                        archive.writestr(name, content)
                data = stream.getvalue()
                manifest = json.loads(members["plugin.json"])
                record = {"commit": "a" * 40, "sha256": pack.sha256(data), "bytes": len(data),
                          "version": manifest["version"], "layout": manifest["ui"]["layout"],
                          "controller_payload_unchanged": not changed}
                committed = dict(members)
                def committed_file(commit, path):
                    if commit == FROZEN_ARTIFACT_COMMIT:
                        return frozen
                    self.assertEqual(record["commit"], commit)
                    self.assertEqual(Path("plugins/miui-activity-retention"), path.parent)
                    return committed[path.name]
                with patch.object(pack, "package", return_value=(data, None)), \
                        patch.object(pack, "committed_file", side_effect=committed_file):
                    self.assert_current_candidate(data, record)
                    with self.assertRaises(AssertionError):
                        self.assert_current_candidate(data, dict(record, controller_payload_unchanged=changed))
                    committed["activity-lists.jar"] += b"uncommitted payload"
                    with self.assertRaises(AssertionError):
                        self.assert_current_candidate(data, record)


if __name__ == "__main__":
    unittest.main()
