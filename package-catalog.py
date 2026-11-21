#!/usr/bin/env python3
"""Build and verify the default Injector repository catalog without running hooks."""

import argparse
import hashlib
import io
import json
from pathlib import Path
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent
MIUI = "miui-floating-windows"
ARCHIVE_LIMIT = 128 * 1024 * 1024
COMMON = ("plugin.json", "hook.sh", "README.md", "NOTICE.md")
PACKAGE_FILES = {
    "battery-charge-limit": COMMON + ("thresholds.sh",),
    "cpu-control": COMMON,
    MIUI: COMMON + (
        "PROVENANCE.md",
        "agent.js",
        "agent-source/agent.js",
        "agent-source/bun.lock",
        "agent-source/limit.js",
        "agent-source/limit.test.js",
        "agent-source/package.json",
        "build-injector.sh",
        "licenses/LGPL-2.0.txt",
        "licenses/bridge-exception.txt",
        "licenses/efni.txt",
        "licenses/frida-core.txt",
        "licenses/frida-gum.txt",
        "payload.sha256",
        "policy-neutral.patch",
        "worker.sh",
    ),
}
CATALOG_DESCRIPTIONS = {
    "battery-charge-limit": "Set charge limits on supported devices. Device testing pending.",
    "cpu-control": "Control CPU governors and frequency ceilings. Device testing pending.",
    MIUI: "Experimental. Not working on the tested HyperOS firmware.",
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def package_path(plugin):
    return Path("packages") / f"{plugin}.zip"


def package(plugin, binary):
    manifest_path = Path("plugins") / plugin / "plugin.json"
    source = (ROOT / manifest_path).parent
    members = {name: (source / name).read_bytes() for name in PACKAGE_FILES[plugin]}
    manifest = json.loads(members["plugin.json"])
    if manifest["id"] != plugin or any(hook not in members for hook in manifest["hooks"].values() if hook is not None):
        raise ValueError(f"Manifest ID or hooks do not match the package: {manifest_path}")
    if plugin == MIUI:
        members["frida-inject"] = binary
        pins = dict(line.split()[::-1] for line in members["payload.sha256"].decode("ascii").splitlines())
        if set(pins) != {"agent.js", "frida-inject"}:
            raise ValueError("Expected pins for agent.js and frida-inject")
        for name, digest in pins.items():
            if sha256(members[name]) != digest:
                raise ValueError(f"Payload SHA-256 mismatch: {name}")

    stream = io.BytesIO()
    # Stored ZIP entries avoid compressor version effects on the published hashes.
    with zipfile.ZipFile(stream, "w", allowZip64=False) as archive:
        for name, data in sorted(members.items()):
            entry = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            entry.create_system = 3
            mode = 0o100755 if name == "frida-inject" else 0o100644
            entry.external_attr = mode << 16
            archive.writestr(entry, data)
    data = stream.getvalue()
    if len(data) > ARCHIVE_LIMIT:
        raise ValueError(f"Package exceeds Injector's archive limit: {plugin}")
    catalog_entry = {
        "name": manifest["name"],
        "description": CATALOG_DESCRIPTIONS[plugin],
        "manifestUrl": manifest_path.as_posix(),
        "packageUrl": package_path(plugin).as_posix(),
        "sha256": sha256(data),
    }
    return data, catalog_entry


def packaged_binary():
    with zipfile.ZipFile(ROOT / package_path(MIUI)) as archive:
        if archive.getinfo("frida-inject").file_size > ARCHIVE_LIMIT:
            raise ValueError("Packaged frida-inject exceeds Injector's archive limit")
        return archive.read("frida-inject")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    build = commands.add_parser("build", help="rebuild catalog.json and all plugin ZIPs")
    build.add_argument("--frida-inject", type=Path, required=True, help="pinned custom Android arm64 injector")
    commands.add_parser("verify", help="check the catalog and ZIPs against the source and payload pins")
    args = parser.parse_args()

    try:
        binary = args.frida_inject.read_bytes() if args.command == "build" else packaged_binary()
        outputs = {}
        entries = []
        for plugin in PACKAGE_FILES:
            data, entry = package(plugin, binary)
            outputs[package_path(plugin)] = data
            entries.append(entry)
        outputs[Path("catalog.json")] = (json.dumps(entries, indent=2) + "\n").encode("utf-8")

        if args.command == "build":
            temporary = ROOT / ".tmp"
            temporary.mkdir(exist_ok=True)
            with tempfile.TemporaryDirectory(dir=temporary) as stage:
                for path, data in outputs.items():
                    staged = Path(stage) / path
                    staged.parent.mkdir(parents=True, exist_ok=True)
                    staged.write_bytes(data)
                for path in outputs:
                    target = ROOT / path
                    target.parent.mkdir(parents=True, exist_ok=True)
                    (Path(stage) / path).replace(target)
        else:
            for path, data in outputs.items():
                if (ROOT / path).read_bytes() != data:
                    raise ValueError(f"Does not match reproducible output: {path}")
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as exc:
        parser.exit(1, f"{parser.prog}: {exc}\n")

    for entry in entries:
        print(f"{entry['sha256']}  {entry['packageUrl']}")


if __name__ == "__main__":
    main()
