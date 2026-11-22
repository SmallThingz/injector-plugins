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
java -cp "$classpath" InventoryTest
java -cp "$classpath" ParcelCapacityTest
java -cp "$classpath" PackageChangesTest "$work/cursor"
mkdir "$work/journal"
java -cp "$classpath" TxnTest "$work/journal"
java -cp "$classpath" BridgeDisableTest "$work/journal"
bash tests/inspection-lock.sh "$work/lock-test"
