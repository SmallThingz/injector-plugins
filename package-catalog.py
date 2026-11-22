#!/usr/bin/env python3
"""Package reviewed working sources for A; validate explicit A pins to build catalog B.

No hooks run. No commits, tags, remotes or historical release records are changed.
After committing sources and ZIPs as A, pass --release explicitly: A's inherited
catalog/release.json is not the new release. Local tag checks do not verify publication.
"""

import argparse
from decimal import Decimal
import hashlib
import io
import json
from pathlib import Path
import re
import shlex
import stat
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent
REPOSITORY = "https://github.com/SmallThingz/injector-plugins"
ARCHIVE_LIMIT = 128 * 1024 * 1024
COMMON = ("plugin.json", "hook.sh", "README.md", "NOTICE.md")
PACKAGE_FILES = {
    "battery-charge-limit": COMMON + ("thresholds.sh", "input-suspend.sh", "session.sh", "native-charge"),
    "cpu-control": ("plugin.json", "cpu-control-native", "README.md", "NOTICE.md"),
    "caffeine": ("plugin.json", "acquire.json", "release.json"),
}
CATALOG_DESCRIPTIONS = {
    "battery-charge-limit": "Requires a supported charge controller.",
    "cpu-control": "Per-policy frequency limits, governors and live monitoring on amethyst OS3.0.303.",
    "caffeine": "Keep the screen awake across apps for 15 or 30 minutes.",
}
CATALOG_ICONS = {"battery-charge-limit": "battery", "cpu-control": "cpu", "caffeine": "plugin"}
DURATIONS = {"300", "900", "1800", "3600", "18000", "indefinite"}
PLUGIN_REFERENCE = re.compile(
    r'\$(?:INJECTOR_PLUGIN_DIR|\{INJECTOR_PLUGIN_DIR(?::\?)?\})/([^\s"\x27;|&()]+)'
)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, indent=2) + "\n").encode("utf-8")


def document(data):
    def unique(pairs):
        obj = {}
        for key, value in pairs:
            if key in obj:
                raise ValueError("Duplicate JSON key: " + key)
            obj[key] = value
        return obj
    return json.loads(data, object_pairs_hook=unique)


def package_path(plugin):
    return Path("packages") / f"{plugin}.zip"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, stderr=subprocess.PIPE)


def safe_path(base, relative):
    relative = Path(relative)
    if relative.is_absolute() or not relative.parts or ".." in relative.parts:
        raise ValueError("Expected a relative path within the selected root")
    path = base
    for component in relative.parts:
        path = path / component
        if path.is_symlink():
            raise ValueError(f"Symlink is not a regular package/output path: {path}")
    return path


def regular_file(base, relative):
    path = safe_path(base, relative)
    info = path.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_size > ARCHIVE_LIMIT:
        raise ValueError(f"Not a bounded regular file: {path}")
    return path.read_bytes()


def shell_closure(members):
    # The reviewed hooks use static plugin-relative imports. Do not guess dynamic
    # imports or silently package new dependencies; update the reviewed allowlist.
    for name, data in members.items():
        if not name.endswith(".sh"):
            continue
        text = data.decode("utf-8")
        for reference in PLUGIN_REFERENCE.finditer(text):
            if reference.group(1) not in members:
                raise ValueError(f"{name}: unpackaged plugin dependency {reference.group(1)}")
        for line in text.splitlines():
            if not re.match(r"^\s*(?:\.|source)\s+", line):
                continue
            words = shlex.split(line, comments=True)
            if len(words) != 2 or not PLUGIN_REFERENCE.fullmatch(words[1]):
                raise ValueError(f"{name}: unsupported dynamic or external shell import")
            if PLUGIN_REFERENCE.fullmatch(words[1]).group(1) not in members:
                raise ValueError(f"{name}: missing imported helper")


def validate_manifest(plugin, members):
    manifest = document(members["plugin.json"])
    if not isinstance(manifest, dict) or manifest.get("id") != plugin:
        raise ValueError("Manifest ID differs from package directory: " + plugin)
    if not isinstance(manifest.get("name"), str) or not manifest["name"].strip():
        raise ValueError("Missing plugin name")
    hooks = manifest.get("hooks")
    if not isinstance(hooks, dict) or set(hooks) != {"enable", "run", "disable"}:
        raise ValueError("Expected enable/run/disable hooks")
    if any(not isinstance(hook, str) or hook not in members for hook in hooks.values()):
        raise ValueError("Missing or undeclared hook file")
    if plugin == "caffeine":
        if (manifest.get("backend"), manifest.get("runtime")) != ("app", "native"):
            raise ValueError("Caffeine requires app/native")
        triggers = manifest.get("triggers", {})
        no_triggers = triggers == {} or (isinstance(triggers, dict) and set(triggers) == {"boot"} and triggers["boot"] is False)
        if manifest.get("session") is not None or not no_triggers:
            raise ValueError("Caffeine must not declare a session or automated triggers")
        for event, path in hooks.items():
            action = document(members[path])
            expected = ({"action": "keep-screen-on", "operation": "release"} if event == "disable" else
                        {"action": "keep-screen-on", "operation": "acquire", "durationInput": "duration"})
            if action != expected:
                raise ValueError("Invalid native descriptor for " + event)
        inputs = manifest.get("ui", {}).get("inputs", [])
        duration = [item for item in inputs if item.get("id") == "duration"]
        if len(duration) != 1 or duration[0].get("type") != "choice":
            raise ValueError("Native durationInput must name one choice input")
        choices = [item["value"] for item in duration[0]["options"]]
        if (not choices or len(set(choices)) != len(choices) or
                not set(choices) <= DURATIONS or duration[0].get("default") not in choices):
            raise ValueError("Unsupported native duration options/default")
    else:
        if plugin == "battery-charge-limit":
            if (manifest.get("backend"), manifest.get("runtime")) != ("root", "shell"):
                raise ValueError("Battery requires root/shell")
            shell_closure(members)
            if sha256(members["native-charge"]) != "00e0cb7c410c1e9029f119f36650d040fd9e404bf12b9995a974c3f1556ac5b1":
                raise ValueError("Battery monitor differs from the reviewed arm64 build")
            if manifest.get("session") != {"protocol": "stdin-lease-v1", "hook": "hook.sh"}:
                raise ValueError("Expected battery stdin-lease-v1 session hook")
            if manifest.get("triggers"):
                raise ValueError("Battery session must not declare automated triggers")
        else:
            if (manifest.get("backend"), manifest.get("runtime")) != ("root", "binary") or set(hooks.values()) != {"cpu-control-native"}:
                raise ValueError("CPU hooks require the reviewed root/binary executable")
            if sha256(members["cpu-control-native"]) != "5f4383057a1ba54057a0a6248463dac731283a7de92f1ec83c5a9508fa83fad2":
                raise ValueError("CPU binary differs from the qualified arm64 build")
            inputs = manifest.get("ui", {}).get("inputs", [])
            by_id = {item["id"]: item for item in inputs}
            if len(by_id) != len(inputs):
                raise ValueError("Duplicate CPU input")
            ceilings = 0
            for policy in ("policy0", "policy4", "policy7"):
                if policy + "_percent" in by_id:
                    raise ValueError("Expected CPU kHz choices, not stale percentage inputs")
                # Device-scoped manifests omit controls unavailable on that device.
                # Packaging must not force read-only policies back into the UI.
                if policy + "_max_khz" not in by_id:
                    continue
                ceilings += 1
                choice = by_id[policy + "_max_khz"]
                if choice.get("type") != "choice" or choice.get("default") != "system":
                    raise ValueError("Expected CPU kHz choices with system default")
                options = choice.get("options", [])
                if not options or len({o["value"] for o in options}) != len(options):
                    raise ValueError("Missing/duplicate CPU choices")
                if "system" not in {o["value"] for o in options}:
                    raise ValueError("CPU choices must include system")
                for option in options:
                    value, label = option["value"], option["label"]
                    if value != "system" and (
                        not isinstance(value, str) or not re.fullmatch(r"[1-9][0-9]*", value) or
                        not isinstance(label, str) or not re.fullmatch(r"[0-9]+(?:\.[0-9]+)? MHz", label) or
                        Decimal(label[:-4]) * 1000 != int(value)
                    ):
                        raise ValueError("CPU MHz label must match its exact kHz value")
            if not ceilings:
                raise ValueError("Expected at least one declared CPU kHz ceiling")
    return manifest


def package(plugin, pin=None, source_root=None):
    source_root = ROOT if source_root is None else source_root
    manifest_path = Path("plugins") / plugin / "plugin.json"
    members = {name: regular_file(source_root, manifest_path.parent / name) for name in PACKAGE_FILES[plugin]}
    if sum(map(len, members.values())) > ARCHIVE_LIMIT or len(members["plugin.json"]) > 65536:
        raise ValueError("Package or manifest exceeds Injector's size limit")
    manifest = validate_manifest(plugin, members)
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", allowZip64=False) as archive:
        for name, data in sorted(members.items()):
            entry = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = (0o100755 if name in ("cpu-control-native", "native-charge") else 0o100644) << 16
            archive.writestr(entry, data)
    data = stream.getvalue()
    if len(data) > ARCHIVE_LIMIT:
        raise ValueError("ZIP exceeds Injector's size limit")
    if pin is None:
        return data, None
    asset = f"{plugin}.zip"
    if sha256(data) != pin["assets"][asset]:
        raise ValueError("Rebuilt package differs from pinned release: " + asset)
    return data, {
        "name": manifest["name"], "description": CATALOG_DESCRIPTIONS[plugin], "icon": CATALOG_ICONS[plugin],
        "release": {"repository": pin["repository"], "commit": pin["commit"], "tag": pin["tag"],
                    "asset": asset, "sha256": pin["assets"][asset], "manifestPath": manifest_path.as_posix()},
    }


def committed_file(commit, path):
    # A symlink blob with coincidentally matching bytes is not a source file.
    listing = git("ls-tree", "-z", commit, "--", str(path)).split(b"\0")
    records = [record for record in listing if record]
    if len(records) != 1:
        raise ValueError("Missing committed regular file: " + str(path))
    metadata, name = records[0].split(b"\t", 1)
    mode, kind, _ = metadata.split()
    if mode not in (b"100644", b"100755") or kind != b"blob" or name.decode() != str(path):
        raise ValueError("Expected committed regular blob: " + str(path))
    return git("show", f"{commit}:{path}")


def release_pin(path, require_tag=False, plugins=None, historical=False):
    plugins = tuple(PACKAGE_FILES if plugins is None else plugins)
    pin = document(path.read_bytes())
    if not isinstance(pin, dict) or set(pin) != {"repository", "commit", "tag", "assets"}:
        raise ValueError("Expected repository, commit, tag and assets in explicit release metadata")
    if pin["repository"] != REPOSITORY:
        raise ValueError("Unexpected release repository")
    if not isinstance(pin["commit"], str) or not re.fullmatch(r"[a-f0-9]{40}", pin["commit"]):
        raise ValueError("Release commit must be a full Git commit hash; pending pins are not publishable")
    if not isinstance(pin["tag"], str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", pin["tag"]):
        raise ValueError("Invalid release tag")
    git("check-ref-format", f"refs/tags/{pin['tag']}")
    if not isinstance(pin["assets"], dict) or set(pin["assets"]) != {p + ".zip" for p in (PACKAGE_FILES if historical else plugins)}:
        raise ValueError("Unexpected release asset set")
    if any(not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest)
           for digest in pin["assets"].values()):
        raise ValueError("Release asset hashes must be SHA-256")

    commit = pin["commit"]
    if git("rev-parse", "--verify", commit + "^{commit}").decode().strip() != commit:
        raise ValueError("Release pin does not identify a commit")
    paths = [str(path) for p in plugins for path in (Path("plugins") / p, package_path(p))]
    if git("diff", "--name-only", commit, "--", *paths).strip():
        raise ValueError("Working sources/packages differ from source A")
    if git("ls-files", "--others", "--exclude-standard", "--", *paths).strip():
        raise ValueError("Uncommitted plugin source/package files are absent from source A")
    for plugin in plugins:
        for name in PACKAGE_FILES[plugin]:
            path = Path("plugins") / plugin / name
            if committed_file(commit, path) != regular_file(ROOT, path):
                raise ValueError("Source A file differs: " + str(path))
        path = package_path(plugin)
        data = committed_file(commit, path)
        if data != regular_file(ROOT, path) or sha256(data) != pin["assets"][path.name]:
            raise ValueError("Release hash differs from source A: " + path.name)
        # Check source-to-archive reproducibility, not just two copies of a bad ZIP.
        rebuilt, _ = package(plugin, pin)
        if data != rebuilt:
            raise ValueError("Source A ZIP differs from deterministic source: " + path.name)

    ref = f"refs/tags/{pin['tag']}"
    exists = subprocess.run(["git", "show-ref", "--verify", "--quiet", ref], cwd=ROOT)
    if exists.returncode == 0:
        if git("rev-parse", "--verify", ref + "^{commit}").decode().strip() != commit:
            raise ValueError("Release tag does not resolve to source A")
    elif exists.returncode != 1:
        raise ValueError("Could not inspect local release tag")
    elif require_tag:
        raise ValueError("Release tag is missing locally")
    else:
        print(f"PENDING: {pin['tag']} is absent locally; publication is not verified.")
    return pin


def output_path(path, catalog=False):
    path = path.absolute()
    relative = path.relative_to(ROOT)
    target = safe_path(ROOT, relative)
    if catalog:
        if (path.suffix != ".json" or relative.parts[0] in ("plugins", "packages", ".git", "releases")
                or relative == Path("release.json")):
            raise ValueError("Catalog output must not overwrite release records, sources or packages")
    elif relative.parts[0] not in ("packages", ".tmp"):
        raise ValueError("Package output must be within packages or .tmp")
    return target


def write_outputs(outputs):
    # Validate every destination before writing any output.
    for path in outputs:
        safe_path(ROOT, path.relative_to(ROOT))
        if path.exists() and not path.is_file():
            raise ValueError("Output is not a regular file")
    temporary = ROOT / ".tmp"
    temporary.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=temporary) as stage:
        for index, (target, data) in enumerate(outputs.items()):
            staged = Path(stage) / str(index)
            staged.write_bytes(data)
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists() or target.read_bytes() != data:
                staged.replace(target)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    packages = commands.add_parser("packages", help="build reviewed working-source ZIPs before committing A")
    packages.add_argument("--source-root", type=Path, default=ROOT,
                          help="explicit reviewed source tree; default is this working repository, never a saved candidate")
    packages.add_argument("--package-dir", type=Path, default=ROOT / "packages")
    packages.add_argument("--check", action="store_true", help="compare existing ZIPs without writing")
    for command in ("build", "verify"):
        sub = commands.add_parser(command, help=command + " catalog B from explicit immutable source A pins")
        sub.add_argument("--release", type=Path, required=True,
                         help="new release metadata; inherited/historical release.json is not assumed current")
        sub.add_argument("--catalog", type=Path, default=ROOT / "catalog.json")
        sub.add_argument("--retain", action="append", default=[], metavar="PLUGIN=RELEASE",
                         help="retain a plugin from a previous three-asset release")
        sub.add_argument("--require-tag", action="store_true", help="require matching local tag; no remote verification")
    args = parser.parse_args(argv)
    try:
        pins = {}
        if args.command != "packages":
            for spec in args.retain:
                plugin, sep, path = spec.partition("=")
                if not sep or plugin not in PACKAGE_FILES or plugin in pins:
                    raise ValueError("Expected a unique known PLUGIN=RELEASE")
                pins[plugin] = release_pin(Path(path), args.require_tag, [plugin], historical=True)
            updated = [plugin for plugin in PACKAGE_FILES if plugin not in pins]
            release = release_pin(args.release, args.require_tag, updated)
            pins.update(dict.fromkeys(updated, release))
        outputs, entries, hashes = {}, [], {}
        for plugin in PACKAGE_FILES:
            pin = pins.get(plugin)
            source = args.source_root.absolute() if pin is None else ROOT
            data, entry = package(plugin, pin, source)
            hashes[plugin] = sha256(data)
            if pin is None:
                outputs[output_path(args.package_dir / (plugin + ".zip"))] = data
            else:
                entries.append(entry)
        if pins:
            target = output_path(args.catalog, catalog=True)
            if target == args.release.resolve():
                raise ValueError("Catalog must not overwrite the release pin")
            outputs[target] = encoded({"name": "Injector", "description": "Official Injector plugin catalog.", "plugins": entries})
        check = args.command == "verify" or (args.command == "packages" and args.check)
        if check:
            for path, data in outputs.items():
                if regular_file(ROOT, path.relative_to(ROOT)) != data:
                    raise ValueError("Does not match reproducible output: " + str(path))
        else:
            write_outputs(outputs)
    except (OSError, ValueError, KeyError, TypeError, AttributeError, subprocess.CalledProcessError) as exc:
        parser.exit(1, f"{parser.prog}: {exc}\n")
    for plugin, digest in hashes.items():
        print(f"{digest}  {plugin}.zip")


if __name__ == "__main__":
    main()
