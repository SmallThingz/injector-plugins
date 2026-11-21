# CPU frequency control (pre-alpha)

The native controls match the three CPUFreq policies observed on amethyst OS3.0.303.0.WOPINXM. A frequency governor chooses operating frequencies for the CPUs in a policy. Each group provides its own governor choice and maximum-frequency slider. Save inputs and use Enable or Run to apply them. Use Run to apply edits while enabled.

The first change to a setting saves its current value. The ceiling slider uses that original `scaling_max_freq` throughout subsequent edits. For example, 90% of policy4's observed 2,073,600 kHz ceiling selects 1,824,000 kHz from its driver table. The hook chooses the highest listed frequency at or below the requested percentage and within the live minimum and hardware maximum. If no entry qualifies, it reports the policy, original ceiling, and live minimum before applying any change. A missing frequency table only prevents a new frequency cap.

**System setting** releases the governor override. **100%** releases the frequency override. Disable releases both across all three groups. The hook restores a setting only while its observed value matches the last value it applied. A different value is preserved. Linux exposes separate reads and writes through sysfs, so the comparison and the subsequent write cannot exclude a simultaneous system writer. The journal is scoped to the current boot.

## Native UI integration

The current manifest has static groups and choices. The hook verifies group membership and validates governor requests against `scaling_available_governors`. For a device-generated panel, enumerate `policy[0-9]*` directories and read `related_cpus` for group labels. Populate governor choices from the individual policy. For the ceiling, read `scaling_available_frequencies`, `scaling_min_freq`, `scaling_max_freq`, and `cpuinfo_max_freq`. Show the resolved kHz next to the slider and leave the governor available if the frequency table is missing. During edits, preview against the captured original ceiling while the setting is owned. The current manifest API would need a read-only capability and state query to provide that preview accurately. [Kernel CPUFreq policy interface](https://docs.kernel.org/admin-guide/pm/cpufreq.html#policy-interface-in-sysfs)

## Host verification

Run `python3 -B plugins/cpu-control/test_hooks.py` from the repository root. The 12 tests run the hook under `sh` with relocated kernel paths, simulated UID, and a temporary state directory. No phone writes were part of qualification. The repository root README covers packaging.
