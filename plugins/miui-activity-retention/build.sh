#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
sdk=${ANDROID_HOME:-/home/a/.android/sdk}
platform="$sdk/platforms/android-36/android.jar"
buildtools="$sdk/build-tools/36.0.0"
mkdir -p ../../.tmp
work=$(mktemp -d ../../.tmp/miui-dex.XXXXXXXX)
trap 'rm -rf "$work"' EXIT
mkdir "$work/classes" "$work/dex"
sources=()
for source in *.java; do
    case "$source" in *Test.java) ;; *) sources+=("$source");; esac
done
javac --release 8 -cp "$platform" -d "$work/classes" "${sources[@]}"
"$buildtools/d8" --min-api 29 --lib "$platform" --output "$work/dex" "$work/classes"/*.class
python3 - "$work" <<'PY'
import hashlib
from pathlib import Path
import sys
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

work = Path(sys.argv[1])
jar = work / "activity-lists.jar"
with ZipFile(jar, "w") as archive:
    info = ZipInfo("classes.dex")
    info.external_attr = 0o100644 << 16
    archive.writestr(info, (work / "dex/classes.dex").read_bytes(), compress_type=ZIP_DEFLATED)
digest = hashlib.sha256(jar.read_bytes()).hexdigest()
jar.replace("activity-lists.jar")
Path("payload.sha256").write_text(f"{digest}  activity-lists.jar\n", encoding="ascii")
PY
python3 - <<'PYREVIEW'
import importlib.util
from pathlib import Path

root = Path("../..").resolve()
spec = importlib.util.spec_from_file_location("catalog", root / "package-catalog.py")
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)
plugin = "miui-activity-retention"
data, _ = catalog.package(plugin)
archive = root / ".tmp" / "miui-universal-review" / f"{plugin}.zip"
archive.parent.mkdir(exist_ok=True)
archive.write_bytes(data)
print(catalog.sha256(data), archive)
PYREVIEW
