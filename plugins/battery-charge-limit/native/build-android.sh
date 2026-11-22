#!/bin/sh
set -eu
cd "$(dirname "$0")"
: "${ANDROID_NDK_HOME:?set ANDROID_NDK_HOME to Android NDK 29.0.14206865}"
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android28-clang"
cargo build --release --locked --offline --target aarch64-linux-android
binary="${CARGO_TARGET_DIR:-target}/aarch64-linux-android/release/native-charge"
wc -c "$binary"
sha256sum "$binary"
readelf -ld "$binary" | grep -E 'interpreter|NEEDED'
