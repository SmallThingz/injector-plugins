# Battery charge limit candidate 0.1.0

This candidate packages the direct Rust/Bionic `native-charge` worker. Its manifest supports live CONFIG and read-only inspection under Injector's stdin lease. There are no runtime shell wrappers or migration steps in the ZIP. The worker detects a standard two-threshold battery or uses the separately guarded Qualcomm input-suspend adapter.

The reused arm64 worker is `f2fc24c7b3c88d04a4cc8e446f1dc95984296d6d8b1f8046501f39b39e84a3a8`, built from Injector `2be0d38`; all included Rust build inputs match Injector `2849d9d`. The retained 33-test host suite and Android build record qualify the source/worker provenance. Earlier powered input-suspend tests used a different frozen worker and do not establish this portable candidate's device behavior. This lane performed no physical charging test.

Build inputs and original Android build script are under `native/`. Run `python3 package-native.py battery-charge-limit NEW.zip` from the repository root to package the pinned bytes. The ZIP includes the libc license notice. See [candidate provenance](../../native-candidates.json) and [candidate notes](../../NATIVE-CANDIDATES.md). No catalog promotion or release has occurred.
