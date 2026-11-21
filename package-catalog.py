#!/usr/bin/env python3
"""Build and verify the default Injector repository catalog without running hooks."""

import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent
ARCHIVE_LIMIT = 128 * 1024 * 1024
COMMON = ("plugin.json", "hook.sh", "README.md", "NOTICE.md")
PACKAGE_FILES = {
    "battery-charge-limit": COMMON + ("thresholds.sh",),
    "cpu-control": COMMON,
    "animation-speed": COMMON + ("settings-state.sh",),
    "display-timeout": COMMON + ("settings-state.sh",),
}
CATALOG_DESCRIPTIONS = {
    "battery-charge-limit": "Set charge limits on supported devices. Device testing pending.",
    "cpu-control": "Control CPU governors and frequency ceilings. Device testing pending.",
    "animation-speed": "Adjust Android animation duration and reapply after restart while enabled. Device testing pending.",
    "display-timeout": "Choose the idle screen timeout and reapply after restart while enabled. Device testing pending.",
}
CATALOG_ICONS = {
    "battery-charge-limit": "battery",
    "cpu-control": "cpu",
    "animation-speed": "windows",
    "display-timeout": "plugin",
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def package_path(plugin):
    return Path("packages") / f"{plugin}.zip"


def release_pin(path, require_tag=False):
    pin = json.loads(path.read_text())
    if set(pin) != {"repository", "commit", "tag", "assets"}:
        raise ValueError("Expected repository, commit, tag and assets in release.json")
    if pin["repository"] != "https://github.com/SmallThingz/injector-plugins":
        raise ValueError("Unexpected release repository")
    if not re.fullmatch(r"[a-f0-9]{40}", pin["commit"]):
        raise ValueError("Release commit must be a full Git commit hash")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", pin["tag"]):
        raise ValueError("Invalid release tag")
    subprocess.run(["git", "check-ref-format", f"refs/tags/{pin['tag']}"], cwd=ROOT, check=True)
    if set(pin["assets"]) != {f"{plugin}.zip" for plugin in PACKAGE_FILES}:
        raise ValueError("Expected one release asset for each plugin")
    if any(not re.fullmatch(r"[a-f0-9]{64}", digest) for digest in pin["assets"].values()):
        raise ValueError("Release asset hashes must be SHA-256")

    commit = pin["commit"]
    resolved = subprocess.check_output(
        ["git", "rev-parse", "--verify", f"{commit}^{{commit}}"], cwd=ROOT, text=True
    ).strip()
    if resolved != commit:
        raise ValueError("Release pin does not identify a commit")
    paths = [str(path) for plugin in PACKAGE_FILES
             for path in (Path("plugins") / plugin, package_path(plugin))]
    subprocess.run(
        ["git", "diff", "--exit-code", commit, "--", *paths],
        cwd=ROOT, check=True, stdout=subprocess.DEVNULL,
    )
    extra = subprocess.check_output(
        ["git", "ls-files", "--others", "--exclude-standard", "--", *paths],
        cwd=ROOT, text=True,
    )
    if extra:
        raise ValueError("Uncommitted plugin sources or packages differ from the release commit")
    for asset, digest in pin["assets"].items():
        committed = subprocess.check_output(["git", "show", f"{commit}:packages/{asset}"], cwd=ROOT)
        if sha256(committed) != digest:
            raise ValueError(f"Release hash differs from the source commit: {asset}")
    tag = subprocess.run(
        ["git", "rev-parse", "--verify", f"refs/tags/{pin['tag']}^{{commit}}"],
        cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )
    tag_exists = subprocess.run(
        ["git", "show-ref", "--verify", "--quiet", f"refs/tags/{pin['tag']}"], cwd=ROOT,
    ).returncode == 0
    if tag_exists and (tag.returncode != 0 or tag.stdout.strip() != commit):
        raise ValueError("Release tag does not resolve to the source commit")
    if tag.returncode != 0:
        if require_tag:
            raise ValueError("Release tag is missing locally")
        print(f"PENDING: {pin['tag']} has no local tag; publication is not verified.")
    return pin


def package(plugin, pin=None):
    manifest_path = Path("plugins") / plugin / "plugin.json"
    source = (ROOT / manifest_path).parent
    members = {name: (source / name).read_bytes() for name in PACKAGE_FILES[plugin]}
    manifest = json.loads(members["plugin.json"])
    if manifest["id"] != plugin or any(hook not in members for hook in manifest["hooks"].values() if hook is not None):
        raise ValueError(f"Manifest ID or hooks do not match the package: {manifest_path}")

    stream = io.BytesIO()
    # Stored ZIP entries avoid compressor version effects on the published hashes.
    with zipfile.ZipFile(stream, "w", allowZip64=False) as archive:
        for name, data in sorted(members.items()):
            entry = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data)
    data = stream.getvalue()
    if len(data) > ARCHIVE_LIMIT:
        raise ValueError(f"Package exceeds Injector's archive limit: {plugin}")
    asset = f"{plugin}.zip"
    if pin is None:
        return data, None
    if sha256(data) != pin["assets"][asset]:
        raise ValueError(f"Rebuilt package differs from the pinned release: {asset}")
    catalog_entry = {
        "name": manifest["name"],
        "description": CATALOG_DESCRIPTIONS[plugin],
        "icon": CATALOG_ICONS[plugin],
        "release": {
            "repository": pin["repository"],
            "commit": pin["commit"],
            "tag": pin["tag"],
            "asset": asset,
            "sha256": pin["assets"][asset],
            "manifestPath": manifest_path.as_posix(),
        },
    }
    return data, catalog_entry


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("packages", help="build only the four active ZIPs before committing their source")
    for command in ("build", "verify"):
        sub = commands.add_parser(command, help=f"{command} the four active ZIPs and pinned catalog")
        sub.add_argument("--release", type=Path, default=ROOT / "release.json")
        sub.add_argument("--catalog", type=Path, default=ROOT / "catalog.json")
        sub.add_argument("--require-tag", action="store_true", help="require a matching local release tag (does not check publication)")
    args = parser.parse_args()

    try:
        pin = None if args.command == "packages" else release_pin(args.release, args.require_tag)
        outputs = {}
        entries = []
        for plugin in PACKAGE_FILES:
            data, entry = package(plugin, pin)
            outputs[package_path(plugin)] = data
            if entry is not None:
                entries.append(entry)
        if pin is not None:
            catalog = {"name": "Injector", "description": "Official Injector plugin catalog.", "plugins": entries}
            catalog_path = args.catalog.resolve().relative_to(ROOT)
            if ((ROOT / catalog_path) == args.release.resolve() or catalog_path == Path("release.json")
                    or not catalog_path.parts or catalog_path.parts[0] in ("plugins", "packages", ".git")):
                raise ValueError("Catalog output must not overwrite release pins, sources or packages")
            outputs[catalog_path] = (json.dumps(catalog, indent=2) + "\n").encode("utf-8")

        if args.command != "verify":
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
                    if not target.exists() or target.read_bytes() != outputs[path]:
                        (Path(stage) / path).replace(target)
        else:
            for path, data in outputs.items():
                if (ROOT / path).read_bytes() != data:
                    raise ValueError(f"Does not match reproducible output: {path}")
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError, zipfile.BadZipFile) as exc:
        parser.exit(1, f"{parser.prog}: {exc}\n")

    for plugin in PACKAGE_FILES:
        path = package_path(plugin)
        print(f"{sha256(outputs[path])}  {path}")


if __name__ == "__main__":
    main()
