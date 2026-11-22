# CPU frequency control (pre-alpha)

Supported ABI is **arm64-v8a** on Android API 28 or later. Injector stages the Bionic-linked executable for all three hooks.

The accordion is a static profile for amethyst on HyperOS OS3.0.303.0.WOPINXM. All three policy groups offer the governors listed by the device's read-only root probe. Each group declares the recorded driver table. The CPU monitor filters the visible choices by live policy membership, driver steps, current minimum, original ceiling, hardware maximum and sysfs write permissions. A matching owned ceiling can be raised again within its original bounds. Current frequencies are displayed for readable policies including read-only policies. Enable applies the stored settings. Run applies edits while enabled.

The first change to a setting saves its current value. The maximum-frequency choice writes its exact listed kHz value. The hook checks current CPU membership, available frequencies, live minimum, hardware maximum and captured ceiling at apply time. Current system limits can make a displayed step unavailable. The hook validates governor choices against each policy's live list.

**System setting** releases the override for that control. Disable releases the plugin's owned settings. The hook restores a setting only while its observed value matches the last value it applied. A different value is preserved. Linux exposes separate reads and writes through sysfs, so the comparison and the subsequent write cannot exclude a simultaneous system writer. The journal is scoped to the current boot. Existing callers supplying only the old percentage environment variables can still use the legacy calculation. The ceiling defaults to System setting.

## Read-only probe

Injector renders the declared profile. For live diagnostics, use an already authorized root execution context for the reviewed `cpu-control-native`. Set `INJECTOR_EVENT=probe` and the same staged `PLUGIN_STATE_DIR` used for apply. Serialize with the installed plugin's other operations. The probe reads the current-boot journal and sysfs without creating or changing them. It exits nonzero on pending recovery or invalid journal state.

A successful probe prints one JSON object. Example:

```json
{"version":1,"policies":[{"id":"policy0","governors":["walt","schedutil"],"maxKHz":[1228800,1344000],"minKHz":1228800,"currentMaxKHz":1344000}]}
```

Each `id` identifies a policy. An omitted policy has unsupported membership. An empty array means the control currently has no verified choices. Frequency bounds are null when unavailable. The probe uses the higher of two sampled minima and the original ceiling in a matching owned journal. The apply hook rechecks the requested values before writing. [Kernel CPUFreq policy interface](https://docs.kernel.org/admin-guide/pm/cpufreq.html#policy-interface-in-sysfs)

Three paired read-only probes on amethyst returned identical policy JSON in each pair. Median child CPU time was 19.646 ms for the native hook and 996.825 ms for the shell hook. Median elapsed time was 27.496 ms and 1177.194 ms, respectively. These measurements cover one probe invocation. Whole-app energy use remains unmeasured.

Two physical cycles of the frozen arm64 binary on amethyst verified `walt → schedutil → walt` on policy0 (CPUs 0–3). Each enable recorded exactly `policy0 scaling_governor walt schedutil`. After each disable, readback matched the original governor, the active journal was empty, and no transaction was pending. The worker used private state. Policies 4 and 7 stayed on `walt`, and the worker issued no frequency writes.

On the same boot, the driver exposed 17 steps from 480,000 to 2,400,000 kHz for policy4 and 14 steps from 480,000 to 2,496,000 kHz for policy7 through `scaling_available_frequencies`. The physical probe returned empty selectable ceiling lists for both policies. Earlier handset qualification recorded their ceiling controls as read-only.

## Host verification

Run `python3 -B plugins/cpu-control/native/test_hooks.py` and `python3 -B plugins/cpu-control/native/test_probe.py` from the repository root. The native tests use temporary files and simulated read faults. The shell hook remains in the source tree as the compatibility reference. Build provenance and binary dependencies are in NOTICE.md.
