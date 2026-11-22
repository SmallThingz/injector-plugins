# Native CPU control hook

The one-shot executable accepts `INJECTOR_EVENT=enable|configure|run|disable|probe` and the CPU plugin's existing environment inputs. It requires the caller's authorized root context. The three supported policies and their expected CPU memberships match the amethyst CPU shell hook. Probe returns its version-1 JSON on stdout.

Enable, configure and run plan all requested changes under the boot-scoped nonblocking lock. Before each driver write they compare the expected value and check membership, permissions, live limits and any required frequency-table entry. Disable restores owned settings and releases fields changed externally. The pending directory uses the shell hook's plan, reverse, next, verify and attempt files. Renaming next over active commits the transaction. An interrupted operation leaves outstanding attempts available to either implementation on the next mutation event. Journal recovery covers process death within the current boot. Each input file read is bounded to 64 KiB.

Configure exits 0 on acceptance and 1 on confirmed rejection, including a failure followed by complete rollback. Other exit codes mean the outcome is unconfirmed. The worker returns 2 when journal recovery fails.

## Build and qualify

Run these commands on Linux x86-64 from the repository root. They use installed tools and place release products under /tmp.

```sh
cd plugins/native-power
export ANDROID_NDK_HOME=/home/a/.android/sdk/ndk/29.0.14206865
CARGO_TARGET_DIR=/tmp/injector-native-power-android rustup run stable ./build-android.sh
CARGO_TARGET_DIR=/tmp/injector-native-power-host rustup run stable cargo build --locked --offline --release
PYTHONDONTWRITEBYTECODE=1 python3 test_hooks.py
python3 test_probe.py
```

The Android script targets `aarch64-linux-android`, uses the NDK API 28 clang driver and reports byte count, SHA-256, interpreter and direct shared dependencies. The release profile enables size optimization, LTO, one codegen unit, panic abort and stripping. Cargo has zero third-party dependencies.

The contract suite inherits the existing CPU plugin cases and runs each hook event through a fixture build. The fixture substitutes temporary paths, caller identity and read faults at compile time. Its two additional tests exercise interrupted shell-to-native and native-to-shell recovery with changed policy membership. The package manifest selects the native executable. The shell reference remains available to the fixture. The separate probe comparison uses strace and compares output, diagnostics and exit status. On the three-policy Linux fixture it counted 41 successful execve calls for shell and one for native, including the initial process and substituting the UID check in both.

Three paired read-only probe runs on amethyst returned identical JSON. Median child CPU time was 19.646 ms native versus 996.825 ms shell; elapsed time was 27.496 ms versus 1177.194 ms. No CPU setting changed. These short samples do not measure whole-app energy use.

Two physical cycles of the frozen arm64 binary on amethyst verified `walt → schedutil → walt` on policy0 (CPUs 0–3). Each enable recorded exactly `policy0 scaling_governor walt schedutil`. After each disable, readback matched the original governor, the active journal was empty, and no transaction was pending. The worker used private state. Policies 4 and 7 stayed on `walt`, and the worker issued no frequency writes.

On the same boot, the driver exposed 17 steps from 480,000 to 2,400,000 kHz for policy4 and 14 steps from 480,000 to 2,496,000 kHz for policy7 through `scaling_available_frequencies`. The physical probe returned empty selectable ceiling lists for both policies. Earlier handset qualification recorded their ceiling controls as read-only.

Injector retains the cycle receipt at `.tmp/qa/phone-followup/native-cpu-70d-governor-two-cycles.json` (SHA-256 `96e81be407319bfa0bceeb0c58e7e01719fff4d2c3fca8e174f964424996bf6c`) and the driver inventory at `.tmp/qa/phone-followup/cpu-policy-read-20261122.json`.

Use `python3 scripts/package-native-plugin.py cpu-control OUTPUT.zip --binary ANDROID_NATIVE_POWER` to assemble the native package. The executable has no polling loop, session protocol or battery adapter.

## Previously qualified artifacts

RD used rustc 1.99.1 (58cf8f9c35b355199727627d07ae34a4e2846d67), Cargo 1.99.1 and NDK 29.0.14206865. Two separate Android build directories produced byte-identical executables.

| Target | Bytes | SHA-256 | Direct ELF dependencies |
| --- | ---: | --- | --- |
| Android arm64 API 28 | 336352 | `5f4383057a1ba54057a0a6248463dac731283a7de92f1ec83c5a9508fa83fad2` | libdl.so, libc.so |
| Linux x86-64 | 364624 | `0052fe4f9bd8688f6dca228f1b0294decdc35b1fd985411d7475214b716df700` | libgcc_s.so.1, libc.so.6 |

The Android interpreter is `/system/bin/linker64`. The reference shell hook SHA-256 is `63e343d5f3977c68e10fb2112d98760ab5b3f017c9e61c146cf576466a7c98e5`. The inherited Python suite SHA-256 is `593acd2e91133a21bc0edaa45243d607c4e1b8794e1ecd46b3732d48f3eecb6c`.
