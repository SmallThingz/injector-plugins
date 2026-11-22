#!/usr/bin/env python3
"""Package the pinned native candidates without building, executing or publishing them.

Adapted from SmallThingz/Injector scripts/package-native-plugin.py at 2849d9d.
The separate catalog packager and inherited catalog are intentionally not updated here.
"""
import argparse
import hashlib
import json
from pathlib import Path
import stat
import struct
import zipfile

ROOT = Path(__file__).resolve().parent
MEMBERS = {
    "battery-charge-limit": ("NOTICE.md", "native-charge", "plugin.json"),
    "cpu-control": ("NOTICE.md", "native-power", "plugin.json"),
    "caffeine": ("acquire.json", "plugin.json", "release.json"),
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def android_arm64(data):
    if len(data) < 64 or data[:6] != b"\x7fELF\x02\x01" or struct.unpack_from("<H", data, 18)[0] != 183:
        return False
    table = struct.unpack_from("<Q", data, 32)[0]
    stride, count = struct.unpack_from("<HH", data, 54)
    if stride != 56 or table + stride * count > len(data):
        return False
    for entry in range(table, table + stride * count, stride):
        if struct.unpack_from("<I", data, entry)[0] == 3:
            offset = struct.unpack_from("<Q", data, entry + 8)[0]
            size = struct.unpack_from("<Q", data, entry + 32)[0]
            return offset + size <= len(data) and data[offset:offset + size] == b"/system/bin/linker64\0"
    return False


def checked_file(root, name):
    relative = Path(name)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("Expected a path inside the candidate checkout")
    path = root
    for part in relative.parts:
        path /= part
        if path.is_symlink():
            raise ValueError("Candidate inputs cannot be symlinks")
    if not path.is_file():
        raise ValueError("Candidate input is not a regular file: " + name)
    return path.read_bytes()


def package(plugin, output, root=ROOT):
    record = json.loads(checked_file(root, "native-candidates.json"))["packages"][plugin]
    for path, source in record["source_files"].items():
        if sha256(checked_file(root, path)) != source["sha256"]:
            raise ValueError("Source differs from candidate provenance: " + path)
    base = "plugins/" + plugin + "/"
    payload = {name: checked_file(root, base + name) for name in MEMBERS[plugin]}
    manifest = json.loads(payload["plugin.json"])
    if manifest["id"] != plugin or manifest["version"] != "0.1.0":
        raise ValueError("Expected the canonical plugin ID and version 0.1.0")
    hooks = set(manifest["hooks"].values())
    if manifest.get("session"):
        hooks.add(manifest["session"]["hook"])
    worker = record.get("worker")
    if worker:
        name = Path(worker["path"]).name
        if manifest["runtime"] != "binary" or manifest["backend"] != "root" or hooks != {name}:
            raise ValueError("Binary hooks must name only the direct worker")
        if sha256(payload[name]) != worker["sha256"] or not android_arm64(payload[name]):
            raise ValueError("Worker identity or Android ABI differs from provenance")
    elif manifest["runtime"] != "native" or manifest["backend"] != "app" or hooks != {"acquire.json", "release.json"}:
        raise ValueError("Caffeine must use the app-owned native JSON actions")
    # Fixed ordering, date, mode and compression; refuse to replace any existing output.
    with zipfile.ZipFile(output, "x") as archive:
        for name, data in sorted(payload.items()):
            entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            executable = worker is not None and name == Path(worker["path"]).name
            entry.external_attr = (stat.S_IFREG | (0o755 if executable else 0o644)) << 16
            archive.writestr(entry, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return sha256(Path(output).read_bytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plugin", choices=MEMBERS)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(package(args.plugin, args.output), args.output)


if __name__ == "__main__":
    main()
