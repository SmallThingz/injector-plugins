# Native CPU hook qualification

The Android arm64 executable and frozen source hashes are recorded in the package NOTICE.md, alongside toolchain versions and the offline rebuild command. The host contract suite and probe comparison run from the repository root.

```sh
python3 -B plugins/cpu-control/native/test_hooks.py
python3 -B plugins/cpu-control/native/test_probe.py
```

The three-policy host probe fixture recorded one successful executable launch for native and 41 for shell. On amethyst, three paired read-only invocations produced identical policy JSON within each pair.

| Median per probe | Native | Shell |
| --- | ---: | ---: |
| Child CPU time | 19.646 ms | 996.825 ms |
| Elapsed time | 27.496 ms | 1177.194 ms |

The retained Injector QA receipt is `native-cpu-probe-20261122.json`, SHA-256 `938944060eaef40a87d17b474882f2a11a776ba999f0d5dcef8a27b82d7becbc`. The probe performed no CPU setting writes. Whole-app energy use remains unmeasured.

Two physical cycles of the frozen arm64 binary on amethyst verified `walt → schedutil → walt` on policy0 (CPUs 0–3). Each enable recorded exactly `policy0 scaling_governor walt schedutil`. After each disable, readback matched the original governor, the active journal was empty, and no transaction was pending. The worker used private state. Policies 4 and 7 stayed on `walt`, and the worker issued no frequency writes.

On the same boot, the driver exposed 17 steps from 480,000 to 2,400,000 kHz for policy4 and 14 steps from 480,000 to 2,496,000 kHz for policy7 through `scaling_available_frequencies`. The physical probe returned empty selectable ceiling lists for both policies. Earlier handset qualification recorded their ceiling controls as read-only.

Injector retains the cycle receipt at `.tmp/qa/phone-followup/native-cpu-70d-governor-two-cycles.json` (SHA-256 `96e81be407319bfa0bceeb0c58e7e01719fff4d2c3fca8e174f964424996bf6c`) and the driver inventory at `.tmp/qa/phone-followup/cpu-policy-read-20261122.json`.
