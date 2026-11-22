# Injector plugins

Default catalog for [Injector](https://github.com/SmallThingz/Injector). Plugins install disabled and run only after the user enables them. Root-backed plugins use existing granted root; they do not acquire it.

| Plugin | Device qualification |
| --- | --- |
| [Animation speed](plugins/animation-speed/README.md) | Apply and Disable restored all three original animation scales. |
| [Display timeout](plugins/display-timeout/README.md) | Apply and Disable restored the original screen timeout. |
| [CPU frequency control](plugins/cpu-control/README.md) | On amethyst, two policy0 governor cycles restored the original governor. The ceiling attempt stopped at its pre-write guard. |
| [Battery charge limit](plugins/battery-charge-limit/README.md) | Ordinary catalog replacement on amethyst verified the installed pin and native executable. Disable restored the owned setting to suspend=0. The final enabled session used thresholds 74/80 with no pending operation. Controller support varies by device. |

The failing MIUI floating-window plugin is excluded from the current catalog. Its historical source and release remain available. Device apply/restore tests do not prove reboot reapplication or every recovery case; host fault tests cover rollback and external-change preservation separately.

## Release integrity

The public candidate prerelease `plugins-20261122-controls-2` points to source commit `a1ee92c6159004c81159c599486d887c45e0e11f`. Its three ZIPs matched a clean rebuild from committed sources and were checked again after download. The default catalog remains on `plugins-20261122-power-2` pending coordinated catalog promotion. [Candidate release pins](releases/plugins-20261122-controls-2.json) · [Candidate catalog](https://raw.githubusercontent.com/SmallThingz/injector-plugins/8e99a55a6550c3107c5ac5532de62dceef1a7567/catalog.json).

Injector checks the resolved tag, source manifest and downloaded package before installation.

## Build and update

Requires Python 3 and Git. No plugin hook runs during packaging.

```sh
git fetch origin tag plugins-20261122-controls-2
python3 package-catalog.py packages --check
python3 package-catalog.py verify --release releases/plugins-20261122-controls-2.json --require-tag
```

Packages use fixed member allowlists, ordering, timestamps and permissions. To publish changes: commit source and deterministic packages first, choose an unused release tag, create pins referencing that source commit, and generate the catalog with `package-catalog.py build`. Publish new assets, verify the remote tag target and every downloaded hash, then commit the catalog and release pins. Never move a published tag or replace its assets.
