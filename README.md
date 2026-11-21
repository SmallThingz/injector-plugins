# Injector plugin catalog

This repository prepares the default Injector catalog. The active package set
is battery charge limit, CPU frequency control, animation speed and display
timeout. MIUI floating windows is excluded from generated catalogs; its old
source and ZIP remain historical artifacts and are never packaging inputs.
Packaging requires only Python 3 and Git, with no Frida binary or native build.

## Pending candidate

The next proposed tag is `plugins-20261122`. This is a local candidate, not a
published release or a claim of physical qualification. Device qualification
and publication belong to the parent maintainer.

During source preparation, root `release.json` retains the previous release
pins and root `catalog.json` retains the parent's removal of MIUI. They are not
yet the four-plugin catalog. Pending pins and catalog are generated separately
under `.tmp/catalog-candidate/` after source commit A exists. The parent writes
the final root pins and catalog in commit B after physical qualification.
Do not use the pending catalog as an app default before its release is verified.

The previous release is `plugins-20261121`, source commit
`48b04021202534b63fc58493ff71ba2291a4eac6`. Its three immutable ZIP identities
remain recoverable from Git; local verification copies are kept under
`.tmp/priorhistory/plugins-20261121/`. Never replace its assets or move its tag.
The prior catalog commit is `4b1fc9e8cd4130a7ad374633712cf9584cf6d1e5`;
this preparation does not change an app catalog pin.

## Sources and qualification

| Plugin | Catalog source |
| --- | --- |
| [Battery charge limit](plugins/battery-charge-limit/README.md) | Recovery fixes and host tests from Injector commit `8e1416f`. |
| [CPU frequency control](plugins/cpu-control/README.md) | Recovery fixes and host tests from Injector commit `8e1416f`. |
| [Animation speed](plugins/animation-speed/README.md) | Reviewed postboot source; physical qualification pending. |
| [Display timeout](plugins/display-timeout/README.md) | Reviewed postboot source; physical qualification pending. |

The new plugins declare boot reapplication and wait for previously authorized
root. Installation remains disabled until explicitly enabled. Their copied
READMEs and `package.py` describe the upstream standalone import packages.
Catalog ZIPs instead use the root packager below and include README and NOTICE.
No private artifacts, device logs or app build outputs belong in this repository.

## Rebuild and verify

The packager uses a fixed member allowlist, sorted names, fixed timestamps and
permissions, and uncompressed ZIP entries to avoid compressor version effects.
It never executes plugin hooks.

Before source commit A, build only the active ZIPs:

```sh
python3 package-catalog.py packages
```

Commit the reviewed source, packager, documentation and four active ZIPs as A,
excluding root catalog/release pins. Then create a pending release pin with
exactly `repository`, `commit`, `tag`, and `assets`: the repository is
`https://github.com/SmallThingz/injector-plugins`, commit is A's full 40-character
hash, tag is `plugins-20261122`, and assets maps each active ZIP name to its
64-character SHA-256. Build and verify the separate candidate:

```sh
python3 package-catalog.py build --release .tmp/catalog-candidate/release.json --catalog .tmp/catalog-candidate/catalog.json
python3 package-catalog.py verify --release .tmp/catalog-candidate/release.json --catalog .tmp/catalog-candidate/catalog.json
```

Both commands require all four release pins, the actual local source commit,
source/package equality to that commit, committed ZIP hashes, and byte-identical
source rebuilds. Verify also compares the generated catalog bytes. An existing
local tag must resolve to A, including annotated-tag peeling. A missing tag is
explicitly reported as pending; `--require-tag` makes it an error. These checks
do not establish remote publication or physical behavior.

## Catalog contract and parent publication

Each catalog entry contains `name`, `description`, `icon`, and `release`.
The release object requires `repository`, `commit`, `tag`, `asset`, `sha256`,
and `manifestPath`. Consumers must resolve the remote tag to the source commit,
fetch the manifest at that commit, verify the downloaded asset's SHA-256, and
compare its root manifest with that pinned source manifest before import.

After physical qualification, the parent must check the proposed tag and release
are unused remotely, publish the four exact ZIPs from A under a new tag pointing
to A, and verify the remote tag target and every downloaded asset digest.
Never overwrite assets, force tags, or use release-upload clobber options.
Then copy the verified candidate pins and catalog to the root, run
`python3 package-catalog.py verify --require-tag`, and commit those two files as B.
The immutable default catalog URL uses B's full commit hash; its pin is the
SHA-256 of B's exact `catalog.json` bytes. Update the app pin only after verifying
that public catalog and its release assets. Any source/package changes during
qualification require a new source commit and regenerated pins before publication.
