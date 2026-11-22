# CPU frequency control source notice

The manifest, shell reference and host cases originate in SmallThingz/Injector, plugins/cpu-control. The frozen native implementation originates in plugins/native-power in the same Injector workspace. Cargo.toml, Cargo.lock, src/ and build-android.sh are copied alongside this package under native/. The native sources were qualified locally before an upstream source commit was available.

| Frozen source | SHA-256 |
| --- | --- |
| src/main.rs | `11c16feb5218a6060b0a47734952de36285556533485be501f13c090ee4dfacc` |
| src/transaction.rs | `d7fa18eddf72dcf93d1eef8943999c2c29d8cd87f6ad5522f82892bf89bcd45c` |

Build from this repository root on Linux x86-64 with rustc 1.99.1 (58cf8f9c35b355199727627d07ae34a4e2846d67), Cargo 1.99.1, the installed aarch64-linux-android Rust target and NDK 29.0.14206865.

```sh
export ANDROID_NDK_HOME=/home/a/.android/sdk/ndk/29.0.14206865
export CARGO_TARGET_DIR="$PWD/.tmp/native-cpu/target"
rustup run stable ./plugins/cpu-control/native/build-android.sh
cmp "$CARGO_TARGET_DIR/aarch64-linux-android/release/cpu-control-native" plugins/cpu-control/cpu-control-native
```

The stripped Android arm64 API 28 executable is 336352 bytes. SHA-256 is `5f4383057a1ba54057a0a6248463dac731283a7de92f1ec83c5a9508fa83fad2`. It uses /system/bin/linker64, libc.so and libdl.so. Cargo has zero third-party dependencies.
