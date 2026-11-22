#!/usr/bin/env python3
"""Current MIUI candidate packaging checks; no hooks or device calls."""
import importlib.util
import io
from pathlib import Path
import unittest
import zipfile
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("package_catalog", ROOT / "package-catalog.py")
pack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack)


class CurrentMiuiPackagingTests(unittest.TestCase):
    def test_current_predecessor_payload_and_repeatable_archive(self):
        plugin = "miui-activity-retention"
        members = {name: (ROOT / "plugins" / plugin / name).read_bytes()
                   for name in pack.PACKAGE_FILES[plugin]}
        manifest = pack.validate_manifest(plugin, members)
        self.assertEqual(manifest["version"], "0.1.0")
        self.assertEqual(manifest["liveUpdate"]["fromSha256"],
                         "8261ed1a1df0d164fa6f951041614156d4c50921d9534cb86ac9e82ea3b4b337")
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


if __name__ == "__main__":
    unittest.main()
