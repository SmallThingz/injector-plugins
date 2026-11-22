"""Packaging-only checks. No worker, hook, compiler or phone execution."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("package_native", ROOT / "package-native.py")
pack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack)


class NativePackageTest(unittest.TestCase):
    def setUp(self):
        (ROOT / ".tmp").mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=ROOT / ".tmp")
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def copy_candidate(self, plugin):
        shutil.copyfile(ROOT / "native-candidates.json", self.root / "native-candidates.json")
        shutil.copytree(ROOT / "plugins" / plugin, self.root / "plugins" / plugin)
        return self.root / "plugins" / plugin

    def test_exact_members_modes_manifests_and_repeatable_bytes(self):
        for plugin, expected in pack.MEMBERS.items():
            with self.subTest(plugin=plugin):
                first = self.root / (plugin + "-1.zip")
                second = self.root / (plugin + "-2.zip")
                self.assertEqual(pack.package(plugin, first), pack.package(plugin, second))
                self.assertEqual(first.read_bytes(), second.read_bytes())
                with zipfile.ZipFile(first) as archive:
                    self.assertIsNone(archive.testzip())
                    self.assertEqual(sorted(expected), archive.namelist())
                    manifest = json.loads(archive.read("plugin.json"))
                    self.assertEqual("0.1.0", manifest["version"])
                    for info in archive.infolist():
                        self.assertEqual((ROOT / "plugins" / plugin / info.filename).read_bytes(), archive.read(info))
                        self.assertFalse(info.filename.endswith(".sh"))
                        mode = (info.external_attr >> 16) & 0o777
                        self.assertEqual(0o755 if info.filename.startswith("native-") else 0o644, mode)

    def test_source_drift_rejected_before_output(self):
        folder = self.copy_candidate("cpu-control")
        with (folder / "native/src/main.rs").open("ab") as stream:
            stream.write(b"\n// changed\n")
        output = self.root / "out.zip"
        with self.assertRaisesRegex(ValueError, "Source differs"):
            pack.package("cpu-control", output, self.root)
        self.assertFalse(output.exists())

    def test_different_worker_rejected(self):
        folder = self.copy_candidate("battery-charge-limit")
        worker = folder / "native-charge"
        data = bytearray(worker.read_bytes())
        data[-1] ^= 1
        worker.write_bytes(data)
        with self.assertRaisesRegex(ValueError, "Worker identity"):
            pack.package("battery-charge-limit", self.root / "out.zip", self.root)

    def test_wrong_version_rejected_even_with_updated_source_hash(self):
        folder = self.copy_candidate("caffeine")
        path = folder / "plugin.json"
        document = json.loads(path.read_text())
        document["version"] = "0.2.0"
        path.write_text(json.dumps(document))
        provenance = self.root / "native-candidates.json"
        record = json.loads(provenance.read_text())
        record["packages"]["caffeine"]["source_files"]["plugins/caffeine/plugin.json"]["sha256"] = pack.sha256(path.read_bytes())
        provenance.write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, "version 0.1.0"):
            pack.package("caffeine", self.root / "out.zip", self.root)

    def test_existing_output_never_overwritten(self):
        output = self.root / "kept.zip"
        output.write_bytes(b"retained artifact")
        with self.assertRaises(FileExistsError):
            pack.package("caffeine", output)
        self.assertEqual(b"retained artifact", output.read_bytes())

    def test_non_android_elf_rejected(self):
        data = (ROOT / "plugins/cpu-control/native-power").read_bytes()
        self.assertTrue(pack.android_arm64(data))
        self.assertFalse(pack.android_arm64(b"#!/bin/sh\n"))
        self.assertFalse(pack.android_arm64(data.replace(b"/system/bin/linker64", b"/system/bin/linkerXX")))


if __name__ == "__main__":
    unittest.main()
