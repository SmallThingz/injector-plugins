# CPU frequency control (pre-alpha)

The accordion is a static profile for amethyst on HyperOS OS3.0.303.0.WOPINXM. All three policy groups offer the governors listed by the device's read-only root probe. The efficiency cores also offer five listed ceilings from 1228.8 to 1708.8 MHz. Enable applies the stored settings. Run applies edits while enabled.

The first change to a setting saves its current value. The maximum-frequency choice writes its exact listed kHz value. The hook checks current CPU membership, available frequencies, live minimum, hardware maximum and captured ceiling at apply time. Current system limits can make a displayed step unavailable. The hook validates governor choices against each policy's live list.

**System setting** releases the override for that control. Disable releases the plugin's owned settings. The hook restores a setting only while its observed value matches the last value it applied. A different value is preserved. Linux exposes separate reads and writes through sysfs, so the comparison and the subsequent write cannot exclude a simultaneous system writer. The journal is scoped to the current boot. Existing callers supplying only the old percentage environment variables can still use the legacy calculation. The ceiling defaults to System setting.

## Read-only probe

Injector renders the declared profile. For live diagnostics, use an already authorized root execution context for the reviewed `hook.sh`. Set `INJECTOR_EVENT=probe` and the same staged `PLUGIN_STATE_DIR` used for apply. Serialize with the installed plugin's other operations. The probe reads the current-boot journal and sysfs without creating or changing them. It exits nonzero on pending recovery or invalid journal state.

A successful probe prints one JSON object. Example:

```json
{"version":1,"policies":[{"id":"policy0","governors":["walt","schedutil"],"maxKHz":[1228800,1344000],"minKHz":1228800,"currentMaxKHz":1344000}]}
```

Each `id` identifies a policy. An omitted policy has unsupported membership. An empty array means the control currently has no verified choices. Frequency bounds are null when unavailable. The probe uses the higher of two sampled minima and the original ceiling in a matching owned journal. The apply hook rechecks the requested values before writing. [Kernel CPUFreq policy interface](https://docs.kernel.org/admin-guide/pm/cpufreq.html#policy-interface-in-sysfs)

## Host verification

Run `python3 -B plugins/cpu-control/test_hooks.py` from the repository root. The tests run the actual hook under `sh` with relocated kernel paths, simulated UID, and a temporary state directory. Package `plugin.json` and `hook.sh` at the ZIP root for local pre-alpha integration.
