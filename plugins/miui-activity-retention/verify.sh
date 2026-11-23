#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
sdk=${ANDROID_HOME:-/home/a/.android/sdk}
platform="$sdk/platforms/android-36/android.jar"
mkdir -p ../../.tmp
work=$(mktemp -d ../../.tmp/miui-tests.XXXXXXXX)
trap 'rm -rf "$work"' EXIT
mkdir "$work/classes"
javac --release 8 -cp "$platform" -d "$work/classes" *.java tests/*.java
classpath="$work/classes:$platform"
# Invalid arguments fail before Android service access and exercise the real process entry point.
status=0
java -cp "$classpath" ActivityLists > "$work/main.out" 2> "$work/main.err" || status=$?
[[ "$status" == 1 && ! -s "$work/main.out" ]]
grep -Fx 'MIUI worker failure java.lang.IllegalStateException' "$work/main.err"
java -cp "$classpath" InventoryTest
java -cp "$classpath" ParcelCapacityTest
java -cp "$classpath" PackageChangesTest "$work/cursor"
mkdir "$work/journal"
java -cp "$classpath" TxnTest "$work/journal"
java -cp "$classpath" InventoryDeferredTest "$work/journal"
java -cp "$classpath" BridgeDisableTest "$work/journal"
INJECTOR_PLUGIN_DIR=/stage/138e0000-ada1-4a14-a534-000000000001 java -cp "$classpath" CodeUpdateTest "$work/journal"
bash tests/inspection-lock.sh "$work/lock-test"
