# Native charging monitor

The native Battery package targets the exact amethyst firmware verified by the worker. Injector launches the binary directly for supervised monitoring and nonce-bound cold Disable. Cold Disable can acknowledge an already-restored session only after verifying the saved terminal receipt and live controller. For other supported drivers, the separate generic Battery package keeps its shell threshold adapter.

The worker polls the control pipe, an absolute CLOCK_BOOTTIME timerfd, and a signalfd. It accepts at most 63 frame bytes before newline. The 15-second deadline advances on a complete matching heartbeat. READY follows the first successful tick and ACK carries the exact sequence. STOP, EOF, timeout, and handled termination use the same cleanup path. Output backpressure or an unreadable pipe can prevent delivery of a receipt.

Each start, tick, and cleanup takes the existing nonblocking threshold-lock. The worker checks the live controller and the journal’s firmware, boot, controller, session and launch identities. It records write intent before issuing a single sysfs write, checks the deadline before tick writes, verifies readback and renames the completed journal to input-suspend-restored before emitting RESTORED. Conflicts retain the journal. A hard kill can leave outstanding intent for nonce-bound cold recovery to evaluate. Sysfs has separate read and write operations, so a concurrent external writer can race the final check as in the original adapter.

## Local verification

From this directory on Linux, with Rust 1.99.1, Cargo 1.99.1, the locked libc crate available offline, the aarch64-linux-android standard library installed and Android NDK 29.0.14206865:

```sh
cargo build --locked --offline
python3 -B test_monitor.py -v
export ANDROID_NDK_HOME=/home/a/.android/sdk/ndk/29.0.14206865
./build-android.sh
CARGO_TARGET_DIR="$PWD/target/repro-check" ./build-android.sh
cmp target/aarch64-linux-android/release/native-charge target/repro-check/aarch64-linux-android/release/native-charge
```

Host tests use temporary regular files and pipes. The reference run uses the original shell lease and adapter with fixture roots. Tests include confirmed and uncertain cold recovery, duplicate launches, fragmented and malformed frames, lease expiration before a pending write, and a kill between write and readback. The strace test requires Linux ptrace access and checks all 20 heartbeats plus startup and cleanup for descendant processes. Host-only fixture paths and fault injection are compiled out of the Android target. Android firmware behavior, SELinux permissions, runner integration, and charging CPU or power use require separate qualification.


## Local package inventory

Use `python3 scripts/package-native-plugin.py battery-charge-limit OUTPUT.zip --binary ANDROID_NATIVE_CHARGE` from the repository root. This amethyst ZIP contains the canonical `plugins/native-charge/plugin.json` and `native-charge`. A catalog pin for this variant must point to that manifest. The generic variant keeps `plugins/battery-charge-limit/plugin.json`. The generic Battery ZIP still needs its shell dispatcher, threshold and input-suspend adapters, and lease protocol because those files implement its driver selection, writes, and restoration. CPU ships its executable and manifest. Caffeine ships only its manifest and the two app-owned JSON actions.

Injector still uses its host-side `su -c` staging launcher to verify the UID, prepare the private directories and environment, and attach the control pipe. It executes binary workers directly from there. Build scripts, probe scripts, and reference tests are host inputs outside the native ZIPs.
