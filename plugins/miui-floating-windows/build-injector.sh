#!/bin/sh
set -eu
cd "${FRIDA_SOURCE:?Set FRIDA_SOURCE to the patched pinned Frida checkout}"
: "${ANDROID_NDK_ROOT:?Set ANDROID_NDK_ROOT to NDK r29}"
export ANDROID_NDK_ROOT
export XDG_CACHE_HOME="$PWD/../cache" npm_config_cache="$PWD/../npm-cache"
./configure --host=android-arm64 --enable-inject --disable-server --disable-gadget --disable-frida-python --disable-frida-tools --disable-graft-tool -- -Dfrida-core:compat=disabled -Dfrida-gum:v8=disabled -Dfrida-core:compiler_backend=disabled -Dfrida-core:fruity_backend=disabled -Dfrida-core:droidy_backend=disabled -Dfrida-core:barebone_backend=disabled -Dfrida-core:socket_backend=disabled
exec deps/toolchain-linux-x86_64/bin/ninja -C build -j3 subprojects/frida-core/inject/frida-inject
