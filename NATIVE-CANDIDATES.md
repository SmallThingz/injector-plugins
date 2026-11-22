# Current private 0.1.0 candidates

The intended default set is Battery, CPU, Caffeine and MIUI Floating Window Unlimiter. The current Battery worker `6061eca...` was rebuilt from injector-plugins `3ed27bb`; CPU worker `2dbd5bc...` was rebuilt from `d09e2a1`. These newer workers and the reviewed MIUI controller JAR `b54893d8...` are private candidates, not a default-catalog promotion. [native-candidates.json](native-candidates.json) is authoritative for Battery/CPU/Caffeine source maps, worker hashes and archive members; [miui-reviewed-candidate.json](miui-reviewed-candidate.json) records the current MIUI build inputs and JAR/ZIP identities. See [current qualification](CANDIDATE-RELEASE.md) for device gaps.

The earlier `plugins-20261123-native-010-1` and `plugins-20261123-caffeine-010-1` tags are already published at `6390eef6dc8eaaa37da3d1e6b783c179a4fdc34a`. Their assets remain immutable history. Caffeine's native action declarations are retained; this integration does not publish a new Caffeine release. The top-level Injector `2849d9d` and canonical-parent fields in `native-candidates.json` record the original import; the per-package source/build fields identify the rebuilt Battery and CPU. Historical catalog/release pins do not identify these newer private artifacts.

Battery and CPU contain a manifest, one direct Android arm64 Bionic worker and its source/license notice. Caffeine contains only its manifest and two native Android action declarations. Current Rust build inputs and host regressions are under each worker's `native/` directory. Historical evidence remains tied to its original source and worker pins. These canonical native ZIPs have no shell launcher or migration layer.

`package-native.py` checks the recorded source/worker identities, Android ABI and version, and refuses an existing output. The combined `package-catalog.py` now uses that canonical native packaging path and checks provenance when validating release pins; its old native allowlists no longer describe this integration. Packaging executes no hooks and builds no Rust. Matching recorded inputs and archive bytes does not independently recompile the worker or establish device behavior.

```sh
python3 -B test_package_native.py -v
python3 -B package-native.py battery-charge-limit NEW-BATTERY.zip
python3 -B package-native.py cpu-control NEW-CPU.zip
python3 -B package-native.py caffeine NEW-CAFFEINE.zip
```

`proposed_tag` fields are planning metadata, not proof that a tag is unused or that a release occurred. Any later authorized publication must check tag availability and bind the exact source commit, manifest path and ZIP hash. Never move a published tag or replace its assets. Current source commits and private candidates remain separate from release/publication actions.

The unlisted animation-speed, display-timeout and historical miui-floating-windows source templates also use version 0.1.0. Only their version fields changed; their older checked-in ZIPs remain historical bytes and were not regenerated or added to the default catalog. The default miui-activity-retention candidate/version is owned separately.
