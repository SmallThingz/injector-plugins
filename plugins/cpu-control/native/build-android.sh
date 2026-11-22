#!/bin/sh
set -eu
cd "$(dirname "$0")"
: "${ANDROID_NDK_HOME:?Set ANDROID_NDK_HOME to the installed NDK directory}"
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android28-clang"
test -x "$CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER"
cargo build --locked --offline --release --target aarch64-linux-android
binary="${CARGO_TARGET_DIR:-target}/aarch64-linux-android/release/cpu-control-native"
wc -c "$binary"
sha256sum "$binary"
readelf -ld "$binary" | grep -E 'interpreter|NEEDED'
