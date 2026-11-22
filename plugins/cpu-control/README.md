# CPU frequency control candidate 0.1.0

This candidate packages the direct Rust/Bionic `native-power` worker with dynamic CPU-policy discovery, Configure and read-only Inspect. There are no runtime shell wrappers or migration steps in the ZIP. Its inspection/fenced-dispatch protocol requires the corresponding Injector implementation; archive version 0.1.0 is not a compatibility or migration mechanism.

The reused arm64 worker is `579db2c98c61ca1524256a48902d4ea73e71f0d804045177ff1fb8a85cf012f7`, built from Injector `8c8c849`; all included Rust build inputs match Injector `2849d9d`. The retained 35 host hook tests and paired dispatch/locking checks are separate from physical evidence. A prior read-only phone check covered this binary with an empty journal; it did not install this package or qualify live owned-controller recovery. No new device validation was performed in this lane.

Build inputs and the original Android build script are under `native/`. Cargo emits `cpu-control-native`; this same executable is installed as `native-power` to match the manifest, without a wrapper. Run `python3 package-native.py cpu-control NEW.zip` from the repository root to package the pinned bytes. See [candidate provenance](../../native-candidates.json) and [candidate notes](../../NATIVE-CANDIDATES.md). No catalog promotion or release has occurred.
