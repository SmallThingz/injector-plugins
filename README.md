# Injector plugins

Default catalog for [Injector](https://github.com/SmallThingz/Injector). Plugins install disabled and run only after the user enables them. Root-backed plugins use existing granted root; they do not acquire it.

| Plugin | Device qualification |
| --- | --- |
| [Animation speed](plugins/animation-speed/README.md) | Apply and Disable restored all three original animation scales. |
| [Display timeout](plugins/display-timeout/README.md) | Apply and Disable restored the original screen timeout. |
| [CPU frequency control](plugins/cpu-control/README.md) | On amethyst, two policy0 governor cycles restored the original governor. The ceiling attempt stopped at its pre-write guard. |
| [Battery charge limit](plugins/battery-charge-limit/README.md) | Ordinary catalog replacement on amethyst verified the installed pin and native executable. Disable restored the owned setting to suspend=0. The final enabled session used thresholds 74/80 with no pending operation. Controller support varies by device. |
| MIUI Floating Window Unlimiter | On amethyst OS3.0.303.0.WOPINXM, WindowManager reported eight WM-visible freeform tasks across five packages in one trial. The ninth attempt remained unclassified. Independent rendering and input at eight remain unverified. |

The historical `miui-floating-windows` plugin is excluded from the current catalog. Its source and release remain available. Device apply/restore tests do not prove reboot reapplication or every recovery case. Host fault tests cover rollback and external-change preservation separately.

## Release integrity

The public plugin prerelease `plugins-20261122-controls-2` points to source commit `a1ee92c6159004c81159c599486d887c45e0e11f`. Its three ZIPs matched a clean rebuild from committed sources and were checked again after download. The controls-2 catalog pinned Battery, CPU and Caffeine to this release. Battery ordinary replacement was verified on amethyst. The CPU governor results cover the isolated native hook. [Candidate release pins](releases/plugins-20261122-controls-2.json) · [Candidate catalog](https://raw.githubusercontent.com/SmallThingz/injector-plugins/8e99a55a6550c3107c5ac5532de62dceef1a7567/catalog.json).

Caffeine 0.1.3 offers 30 minutes, 1 hour, 5 hours and Unlimited. It retains the existing `indefinite` value. Screen off defaults to Turn off. Pause resumes the remaining duration on wake, and Restart starts the selected duration again on wake. These modes require the matching Injector runtime. Quick Settings cycles through these presets in manifest order on an Injector version that supports all four. Battery and CPU retain their controls-2 release pins.

Injector checks the resolved tag, source manifest and downloaded package before installation.

## Build and update

Requires Python 3 and Git. No plugin hook runs during packaging.

```sh
git fetch origin --tags
python3 package-catalog.py packages --check
python3 package-catalog.py verify --require-tag \
  --release releases/plugins-20261122-miui-unlimiter-1.json \
  --retain battery-charge-limit=releases/plugins-20261122-controls-2.json \
  --retain cpu-control=releases/plugins-20261122-controls-2.json \
  --retain caffeine=releases/plugins-20261122-caffeine-screen-off-1.json
```

Packages use fixed member allowlists, ordering, timestamps and permissions. To publish changes: commit source and deterministic packages first, choose an unused release tag, create pins referencing that source commit, and generate the catalog with `package-catalog.py build`. Publish new assets, verify the remote tag target and every downloaded hash, then commit the catalog and release pins. Never move a published tag or replace its assets.
