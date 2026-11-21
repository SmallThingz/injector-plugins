"""Build a deterministic private import package; does not publish anything."""
import hashlib
import json
from pathlib import Path
import zipfile

PLUGIN = Path(__file__).resolve().parent
manifest = json.loads((PLUGIN / "plugin.json").read_text())
out = PLUGIN.parents[1] / ".tmp/postboot-plugins/dist"
out.mkdir(parents=True, exist_ok=True)
archive = out / f"{manifest['id']}-{manifest['version']}.zip"
files = ("hook.sh", "plugin.json", "settings-state.sh")
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
    for name in files:
        item = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        item.create_system = 3
        item.external_attr = 0o100644 << 16
        item.compress_type = zipfile.ZIP_DEFLATED
        package.writestr(item, (PLUGIN / name).read_bytes(), compresslevel=9)
with zipfile.ZipFile(archive) as package:
    assert package.namelist() == list(files)
    assert package.testzip() is None
    for name in files:
        assert package.read(name) == (PLUGIN / name).read_bytes()
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix(".zip.sha256").write_text(f"{digest}  {archive.name}\n")
print(f"{archive}\n{archive.stat().st_size} bytes\nsha256 {digest}")
