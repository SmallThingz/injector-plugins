# Injector plugin catalog

This is the official plugin catalog for Injector. `catalog.json` contains the
catalog name, description and a `plugins` array. Each entry declares a name,
description, icon and pinned GitHub plugin release.

The plugin sources and ZIPs belong to commit
`48b04021202534b63fc58493ff71ba2291a4eac6`. `release.json` declares that source
commit, the tag `plugins-20261121`, and each asset's SHA-256. The new
catalog is committed separately so its release records can refer to the
existing source commit without a circular commit reference.

The app's immutable default catalog is
`https://raw.githubusercontent.com/SmallThingz/injector-plugins/4b1fc9e8cd4130a7ad374633712cf9584cf6d1e5/catalog.json`,
with SHA-256 `0d3afbaa9702e79654aea2034ca9c6f56bb6935e3a83c64c14feafefbad38969`.

## Catalog schema

The following example shows one entry. The full catalog includes all three
plugins, using the icons `battery`, `cpu` and `windows`.

```json
{
  "name": "Injector",
  "description": "Official Injector plugin catalog.",
  "plugins": [
    {
      "name": "Battery charge limit",
      "description": "Set charge limits on supported devices. Device testing pending.",
      "icon": "battery",
      "release": {
        "repository": "https://github.com/SmallThingz/injector-plugins",
        "commit": "48b04021202534b63fc58493ff71ba2291a4eac6",
        "tag": "plugins-20261121",
        "asset": "battery-charge-limit.zip",
        "sha256": "d07d8936c6bc78e757e1676f33d6427168e344cdc247e22312accddda63470ed",
        "manifestPath": "plugins/battery-charge-limit/plugin.json"
      }
    }
  ]
}
```

Consumers must resolve the release tag to a commit, including peeling annotated
tags, and require equality with `release.commit`. They fetch `manifestPath`
from that commit, download the named GitHub release asset, verify its SHA-256,
and check its root `plugin.json` against the pinned manifest before import.
The GitHub release assets are published from the exact ZIPs in `packages/`.

## Qualification

| Plugin | Qualification |
| --- | --- |
| [Battery charge limit](plugins/battery-charge-limit/README.md) | 17 host tests passed. No phone writes tested. |
| [CPU frequency control](plugins/cpu-control/README.md) | 12 host tests passed. No phone writes tested. |
| [MIUI floating windows](plugins/miui-floating-windows/README.md) | Experimental. 7 host lifecycle tests and 4 agent tests passed. On HyperOS `OS3.0.303.0.WOPINXM`, remote `mmap` returned `MAP_FAILED`, the injector reported `MIUI_NO_AGENT`, and no override was applied. |

## Rebuild and verify

From the repository root, regenerate the catalog using `release.json` and the
existing pinned payload. The Git clone must contain the declared source commit.
The packager uses fixed ZIP metadata and uncompressed entries so that the same
source and pinned payload produce identical bytes.

```sh
python3 package-catalog.py build
python3 package-catalog.py verify
```

Build regenerates `catalog.json` and reproduces all three ZIPs, preserving
existing files when their bytes match. Both commands require the plugin source
and package files to match the declared source commit, compare rebuilt ZIPs
with the committed asset hashes, and check both MIUI payload hashes. Verify
also compares the entire generated catalog with `catalog.json`. An optional
`--frida-inject /path/to/frida-inject` argument to build supplies the exact
pinned custom binary separately. The MIUI source directory carries the pinned
native build recipe, JavaScript source and lockfile, patch, and supplied notices.

## Publication

The [plugin release](https://github.com/SmallThingz/injector-plugins/releases/tag/plugins-20261121)
contains the three declared ZIPs. Its tag resolves to source commit
`48b04021202534b63fc58493ff71ba2291a4eac6`; GitHub's asset digests match the catalog.
Injector stays at app version 0.1.0 without an app release.
