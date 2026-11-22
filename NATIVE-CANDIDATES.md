# Local native candidates

These three 0.1.0 candidates are prepared from Injector commit `2849d9d99f5c4b901fe209adeaacb8ec248ab21d`, on verified canonical remote parent `f6a95a3a0cee8f19061b7a538891f07000e73b13`. They are not published, uploaded or promoted. The inherited `catalog.json`, `release.json`, and root catalog packager remain unchanged for the catalog owner; they still describe previous releases and must not be mistaken for these candidates.

Battery and CPU contain a manifest, one direct Android arm64 Bionic worker and its source/license notice. Caffeine contains only its manifest and two native Android action declarations. Rust build inputs are retained verbatim in each native package's `native/` directory; original upstream host tests and historical evidence stay at their pinned Injector source/evidence locations. Old shell wrappers are absent from these canonical package directories and ZIPs; their history remains in the parent commit. No migration layer is introduced.

`native-candidates.json` pins upstream source paths/hashes and reused binary identities. Packaging refuses changed source, a changed worker, a non-Android ABI, an incorrect manifest version or an existing output. It never executes hooks or builds Rust. Build recipes preserve the recorded NDK/Rust target. A source/binary match here means exact retained build-input identity and recorded worker hash; it is not a fresh independent recompilation or universal device qualification.

```sh
python3 -B test_package_native.py -v
python3 -B package-native.py battery-charge-limit NEW-BATTERY.zip
python3 -B package-native.py cpu-control NEW-CPU.zip
python3 -B package-native.py caffeine NEW-CAFFEINE.zip
```

Proposed unused release names are `plugins-20261123-native-010-1` for Battery/CPU and `plugins-20261123-caffeine-010-1` for Caffeine. Neither local nor remote tags are created here. A later authorized publication must recheck availability and bind the full candidate source commit, manifest path and exact ZIP hash; never replace published assets or move an existing tag. MIUI is a separate owner's lane.
