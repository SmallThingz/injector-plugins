# Injector plugin catalog

This is the default remote catalog for Injector. `catalog.json` uses paths
relative to the catalog URL on the `main` branch. Each entry links to the
source manifest and a ZIP with the same `plugin.json` at its root. Injector
checks the ZIP against the catalog's SHA-256 before import.

| Plugin | Qualification |
| --- | --- |
| [Battery charge limit](plugins/battery-charge-limit/README.md) | 17 host tests passed. No phone writes tested. |
| [CPU frequency control](plugins/cpu-control/README.md) | 12 host tests passed. No phone writes tested. |
| [MIUI floating windows](plugins/miui-floating-windows/README.md) | Experimental. 7 host lifecycle tests and 4 agent tests passed. On HyperOS `OS3.0.303.0.WOPINXM`, remote `mmap` returned `MAP_FAILED`, the injector reported `MIUI_NO_AGENT`, and no override was applied. |

## Rebuild and verify

From the repository root, use the pinned custom arm64 Frida binary or extract
`frida-inject` from the existing experimental package into a temporary output
directory. The packager uses fixed ZIP metadata and uncompressed entries so
that the same source and pinned payload produce identical bytes.

```sh
python3 package-catalog.py build --frida-inject /path/to/frida-inject
python3 package-catalog.py verify
```

The build writes `catalog.json` and the three files in `packages/`. Verification
checks those files against the source, compares their SHA-256 values with the
catalog, and checks both MIUI payload hashes. It can run from a fresh clone
without a separate Frida binary. The MIUI source directory carries the pinned
native build recipe, JavaScript source and lockfile, patch, and supplied
third-party notices.
