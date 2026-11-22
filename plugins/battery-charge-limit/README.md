# Battery charge limit

Private qualification build for Injector. The **Charge window** defaults to 75% for **Resume at or below** and 80% for **Stop at or above**. Its handles share a 0–100% scale and stay at least one percentage point apart. **Enable** applies the stored settings, and **Run** applies later changes. With no saved session, **Run** reports the discovered controller and current values.

The plugin uses a single battery's writable `charge_control_end_threshold` and, when present and writable, `charge_control_start_threshold`. A device with a read-only start threshold accepts a window only when the lower value matches its fixed value. A device with a stop threshold alone cannot apply the two-handle window. A successful apply verifies the threshold values. Charging behavior depends on the driver, which may enforce a narrower range or require a separate charge mode. [Android kernel power supply ABI](https://android.googlesource.com/kernel/common/%2B/android-mainline-tracking/Documentation/ABI/testing/sysfs-class-power)

**Disable** restores the original values, including `0`, after verifying the controller, firmware, and last recorded pair. The plugin keeps its journal if it detects an external change or cannot verify a write. The hook output reports the last verified values when it can read the current pair. Use the existing Disable action again once the recorded values have been reconciled. Injector's management API can invoke Disable again if the app has already switched the plugin off.

On native-threshold devices, the driver handles charging directly. The plugin performs no boot-time writes. If the firmware resets a threshold across reboot, the next hook reports that its saved values conflict with the device.

Run these commands from this directory to build a private import ZIP and run the host tests.

```sh
python3 -m zipfile -c battery-charge-limit.zip plugin.json hook.sh thresholds.sh input-suspend.sh session.sh
python3 test_hooks.py
```

Read-only observations on amethyst OS3.0.303 / Android 16 found both native attributes and a `0/0` starting pair while the charger was disconnected. Run `probe-power.sh` in an already authorized device shell to record the current charger state and attribute modes. Physical qualification needs a charger-connected baseline, exact start/stop readback, observed charging stop and resume while power stays online, and restoration to the captured baseline on Disable.

The installed plugin's amethyst receipt 27 recorded that an 80% stop request left the native stop threshold unchanged. The hook verified the previous thresholds and the subsequent read showed `0/0` with an empty session. This firmware's standard threshold path is unqualified.

`probe-charger-adapter.sh` checks separate charge controls and the firmware's MiCharge input-suspend getter. The AMETHYST discovery showed `/sys/class/qcom-battery/input_suspend` at mode `660`, value `0`, and the MiCharge getter returned `0`. Xiaomi's framework also uses input suspension for a fixed 75%/40% window. Input suspend can change external power delivery as well as charging.

## Xiaomi/QCOM monitor

The exact amethyst OS3.0.303.0.WOPINXM fingerprint routes to the binary input-suspend adapter. Existing native threshold journals retain their original restore path. Other firmware uses native thresholds. A write failure or uncertain readback stays within its original adapter.

The root/shell manifest declares `session: {"protocol":"stdin-lease-v1","hook":"hook.sh"}` without boot or interval triggers. The Injector foreground supervisor starts the staged hook with `INJECTOR_EVENT=monitor`, `INJECTOR_SESSION_PROTOCOL=stdin-lease-v1`, `INJECTOR_SESSION_LEASE_SECONDS=15`, and a canonical lowercase UUID in `INJECTOR_SESSION_ID`. Inputs stay fixed for a session.

The hook records a baseline before accepting any hardware changes. The supervisor sends `HEARTBEAT <uuid> 1` immediately. After the first verified update the hook emits `READY <uuid>` then `ACK <uuid> 1`. The supervisor sends the next exact decimal sequence every three seconds. Each valid frame renews a 15-second lease against kernel uptime and checks the hardware. Diagnostic output uses stderr.

Each journal also records a unique launch identity. If startup fails after committing the baseline, cleanup accepts only that launch's own journal. A duplicate launch cannot release an existing session even if it repeats the supervisor UUID. To check the device shell's timed-read behavior without touching battery state, concatenate `session.sh` and `probe-session-shell.sh` and execute the combined script with `/system/bin/sh`.

On amethyst, the session only starts from a verified input-suspend value of `0`. At or above Stop it requests `1`, at or below Resume it requests `0`, and between them it holds the verified value. Charger `online` may change as a consequence of input suspension, so it does not control the hysteresis. On native-threshold devices, the first heartbeat applies the stored window and later heartbeats verify its continued ownership.

Each backend records the last exact readback and any pending write in its own journal. The Xiaomi journal is also bound to boot identity. Matching `STOP <uuid>`, EOF, or lease expiry attempts verified restoration. Only successful restoration and removal of the owned journal emits `RESTORED <uuid>`. An external change or uncertain write stops the session with exit status 3 and preserves the journal. A failed restore or forced process kill can require explicit Disable. Sysfs reads and writes remain separate operations, and an external writer setting the same value cannot be detected.

Injector's foreground supervisor owns Enable and sends Stop for a live session. After losing the process, an explicit Disable invokes the declared hook with the persisted UUID and the same protocol and lease environment. The hook restores only a matching owned journal. If EOF already restored it, the hook verifies the current baseline against the matching durable restoration receipt. Both paths emit only `RESTORED <uuid>` on stdout and exit cleanly. Missing, mismatched, or conflicting state produces no acknowledgement. The minimum fifteen-minute PluginJobService schedule remains unsuitable. Powered charging stop and resume on this firmware still need qualification.

The exact amethyst Xiaomi/QCOM monitor dispatches to the bundled arm64 native-charge executable once per session. The stdin lease protocol and restoration receipt format are shared with the shell adapter. Disable and cold recovery use the shell path. This candidate has host qualification only.
