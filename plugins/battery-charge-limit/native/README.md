# Charging monitor build provenance

The Rust sources, Cargo.lock and Android build script correspond to Injector's plugins/native-charge working tree. The compiled monitor is included as native-charge in the plugin root. The production target bakes in the exact amethyst firmware, canonical controller paths, and the stdin-lease-v1 contract. Its host-only fixture and fault paths are excluded from the Android target.

The candidate was rebuilt from this directory with Rust 1.99.1, Cargo 1.99.1, libc 0.2.191 (checksum in Cargo.lock), and Android NDK 29.0.14206865, using the aarch64-linux-android API 28 clang driver. It is a stripped 299,200-byte PIE, interpreter /system/bin/linker64, DT_NEEDED libc.so and libdl.so. SHA-256 is 00e0cb7c410c1e9029f119f36650d040fd9e404bf12b9995a974c3f1556ac5b1.

From this directory on Linux with the locked dependency cached and the Rust Android target installed:

```sh
ANDROID_NDK_HOME=/home/a/.android/sdk/ndk/29.0.14206865 ./build-android.sh
cmp ../native-charge target/aarch64-linux-android/release/native-charge
cargo build --locked --offline
python3 -B test_monitor.py -v
python3 -B test_dispatch.py -v
```

The dispatcher test runs with the host ELF and a temporary fake sysfs. The steady-state trace counts process calls after the first acknowledged tick. Device execution, charging behavior and power draw remain unqualified.
