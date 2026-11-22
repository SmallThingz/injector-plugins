# CPU and Battery native source

The source baseline is SmallThingz/Injector commit `0589f1ac485f9318b8fc9dce76f40a090104822d`. The Rust crates, lockfiles, Android build scripts, and native ZIP packager are copied from that commit.

The CPU release manifest is `plugins/cpu-control/plugin.json` and its worker source is `plugins/native-power`. The canonical Battery manifest and worker source are in `plugins/native-charge`. The stable Battery catalog path `plugins/battery-charge-limit/plugin.json` is a byte-for-byte copy of `plugins/native-charge/plugin.json`.

Both canonical ZIPs use version `0.1` and contain their source manifest and one Android arm64 ELF worker. The physical test ZIPs used disposable IDs and display names with the same worker bytes and manifest behavior. The tests covered one CPU governor live change and restore, and Battery stop and resume on the same session followed by restore.

The crate build scripts use the locked offline Android arm64 build. `scripts/package-native-plugin.py` packages each worker and its manifest. Generate reproduction ZIPs at fresh output paths and compare them with the tracked ZIPs before publishing.
