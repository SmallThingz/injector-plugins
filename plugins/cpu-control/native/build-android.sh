#!/bin/sh
set -eu
cd "$(dirname "$0")"
: "${ANDROID_NDK_HOME:?Set ANDROID_NDK_HOME to the installed NDK directory}"
ndk_bin="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin"
case "${ANDROID_ABI:-arm64-v8a}" in
    arm64-v8a)
        target=aarch64-linux-android
        export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$ndk_bin/aarch64-linux-android28-clang"
        ;;
    x86_64)
        target=x86_64-linux-android
        export CARGO_TARGET_X86_64_LINUX_ANDROID_LINKER="$ndk_bin/x86_64-linux-android28-clang"
        ;;
    *)
        echo "Supported Android ABIs are arm64-v8a and x86_64." >&2
        exit 1
        ;;
esac
test -x "$ndk_bin/${target}28-clang"
cargo build --locked --offline --release --target "$target"
binary="${CARGO_TARGET_DIR:-target}/$target/release/cpu-control-native"
wc -c "$binary"
sha256sum "$binary"
readelf -ld "$binary" | grep -E 'interpreter|NEEDED'
