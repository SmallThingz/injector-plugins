#!/usr/bin/env python3
"""Assemble a local plugin ZIP from an explicit allowlist of payload files."""
import argparse
import json
import struct
from pathlib import Path
import zipfile


def is_android_arm64(binary):
    if len(binary) < 64 or binary[:6] != b"\x7fELF\x02\x01" or binary[18:20] != b"\xb7\x00":
        return False
    table = struct.unpack_from("<Q", binary, 32)[0]
    stride, count = struct.unpack_from("<HH", binary, 54)
    if stride != 56 or table + stride * count > len(binary):
        return False
    for entry in range(table, table + stride * count, stride):
        if struct.unpack_from("<I", binary, entry)[0] == 3:  # PT_INTERP
            offset = struct.unpack_from("<Q", binary, entry + 8)[0]
            size = struct.unpack_from("<Q", binary, entry + 32)[0]
            return binary[offset:offset + size] == b"/system/bin/linker64\0"
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plugin", choices=("cpu-control", "battery-charge-limit", "caffeine"))
    parser.add_argument("output", type=Path)
    parser.add_argument("--binary", type=Path)
    args = parser.parse_args()

    folder = "native-charge" if args.plugin == "battery-charge-limit" else args.plugin
    source = Path(__file__).resolve().parents[1] / "plugins" / folder
    manifest_bytes = (source / "plugin.json").read_bytes()
    manifest = json.loads(manifest_bytes)
    files = {}
    if args.plugin == "caffeine":
        if args.binary is not None:
            parser.error("Caffeine uses app-owned JSON actions")
        for hook in set(manifest["hooks"].values()):
            files[hook] = (source / hook).read_bytes()
    else:
        if args.binary is None:
            parser.error("supply the locally built Android arm64 executable with --binary")
        binary = args.binary.read_bytes()
        if not is_android_arm64(binary):
            parser.error("worker must be a little-endian Android arm64 ELF")
        name = "native-power" if args.plugin == "cpu-control" else "native-charge"
        files[name] = binary

    hooks = set(manifest["hooks"].values())
    if manifest.get("session") is not None:
        hooks.add(manifest["session"]["hook"])
    if manifest["id"] != args.plugin or hooks != files.keys():
        parser.error("canonical manifest and package payload disagree")

    # Refuse overwrite so a tested artifact remains identifiable.
    with zipfile.ZipFile(args.output, "x") as bundle:
        payload = {"plugin.json": manifest_bytes, **files}
        for name, content in sorted(payload.items()):
            bundle.writestr(zipfile.ZipInfo(name), content, compress_type=zipfile.ZIP_DEFLATED)


if __name__ == "__main__":
    main()
