# Injector plugins

Default catalog for [Injector](https://github.com/SmallThingz/Injector). Plugins install disabled and run only after the user enables them. Root-backed plugins use existing granted root; they do not acquire it.

| Plugin | Device qualification |
| --- | --- |
| [Animation speed](plugins/animation-speed/README.md) | Apply and Disable restored all three original animation scales. |
| [Display timeout](plugins/display-timeout/README.md) | Apply and Disable restored the original screen timeout. |
| [CPU frequency control](plugins/cpu-control/README.md) | Physical apply/restore unverified: a transient minimum above the requested ceiling caused the pre-write guard to stop. |
| [Battery charge limit](plugins/battery-charge-limit/README.md) | Powered charging stop/resume unverified. Controller support varies by device. |

The failing MIUI floating-window plugin is excluded from the current catalog. Its historical source and release remain available. Device apply/restore tests do not prove reboot reapplication or every recovery case; host fault tests cover rollback and external-change preservation separately.

## Release integrity

The current plugin-package prerelease is `plugins-20261122`, source commit `5bd2c075383bd0cfb22eb6b3ccaae2f47a9aa0a7`. `release.json` pins the full commit, tag, asset names and SHA-256 hashes. Each catalog entry also identifies its source manifest. Injector checks the resolved tag, manifest and downloaded bytes before installation. These checks identify the artifacts; they do not establish reproducible compilation of arbitrary binaries.

Old tags and assets are never overwritten. The preceding package release is `plugins-20261121` at source commit `48b04021202534b63fc58493ff71ba2291a4eac6`.

## Build and update

Requires Python 3 and Git. No plugin hook runs during packaging.

```sh
python3 package-catalog.py packages
python3 package-catalog.py verify --require-tag
```

Packages use fixed member allowlists, ordering, timestamps and permissions. To publish changes: commit source and deterministic packages first, choose an unused release tag, create pins referencing that source commit, and generate the catalog with `package-catalog.py build`. Publish new assets, verify the remote tag target and every downloaded hash, then commit the catalog and release pins. Never move a published tag or replace its assets.
