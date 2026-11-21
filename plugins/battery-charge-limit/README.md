# Battery charge limit

Private qualification build for Injector. **Configure** has native sliders for **Stop at** (80% by default) and **Resume below** (75%). **Save** stores the settings. **Enable** applies them, and **Run** applies later changes. With no saved session, **Run** only reports the discovered controller and current values.

The plugin uses a single battery's writable `charge_control_end_threshold` and, when present and writable, `charge_control_start_threshold`. A read-only start threshold stays fixed. With an end threshold alone, the device chooses when to resume. Some drivers round thresholds or require a separate charge mode before they enforce them. The plugin verifies exact readback and leaves the device's charge mode and vendor controls alone. [Linux power supply ABI](https://raw.githubusercontent.com/torvalds/linux/master/Documentation/ABI/testing/sysfs-class-power)

**Disable** restores the original values, including `0`, after verifying the controller, firmware, and last recorded pair. The plugin keeps its journal if it detects an external change or cannot verify a write. The hook output reports the last verified values when it can read the current pair. Use the existing Disable action again once the recorded values have been reconciled. Injector's management API can invoke Disable again if the app has already switched the plugin off.

The driver handles charging directly. The plugin starts no worker and performs no boot-time writes. If the firmware resets a threshold across reboot, the next hook reports that its saved values conflict with the device.

From this directory, run the host tests with the following command. Charger-connected stop/resume enforcement remains pending. The repository root README covers packaging.

```sh
python3 test_hooks.py
```

Earlier read-only observations on amethyst OS3.0.303 / Android 16 found both native attributes and a `0/0` starting pair while the charger was disconnected. Setting/readback and restoration alone do not establish charging enforcement: a charger-connected stop and resume cycle remains pending with the parent. This packaging task performs no device qualification.
