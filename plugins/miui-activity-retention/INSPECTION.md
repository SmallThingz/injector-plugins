# Current-state inspection

The installed universal release is `ef7858ef77304dc6553287a381ef3e2b90244fcf`, tag `plugins-20261122-miui-universal-1`, ZIP SHA-256 `8261ed1a1df0d164fa6f951041614156d4c50921d9534cb86ac9e82ea3b4b337`. Its shell launches the Java framework bridge through app_process. The released universal wrapper has no internal timeout. Phone Disable 452 and Enable 454 both report exit 137 and `Killed`. The retained results do not identify why, or at which phase the process was killed.

## Candidate protocol

A reviewed matching build exposes `INJECTOR_EVENT=inspect-state` and a fresh lowercase UUID in `INJECTOR_INSPECT_ID`. Success prints this exact one-line shape with a newline:

```text
MIUI_STATE <challenge> <boot> <ACTIVE|INACTIVE> <journal-sha256> <read-ms>
```

The wrapper requires the already-authorized caller and same framework and payload checks as the installed release. It opens the existing regular controller lock read-only and takes it nonblocking. The candidate must already be staged with a readable, immutable bridge; inspection never copies it into the journal directory, creates that directory or opens the lock for writing. Keep the bridge and wrapper together from the reviewed candidate. An unsupported image, denied access, unavailable lock or malformed response is inconclusive.

Both positive states require a settled same-boot journal and two exact ordered reads of both controller lists matching its saved image. ACTIVE requires a verified active journal. INACTIVE requires a settled inactive journal with no remaining owned entries. Missing, stale-boot, malformed, pending, reconciling, migration-inconsistent and externally changed states produce no positive proof. A TXN2 pending bit carries the pre-dispatch checkpoint, not a durable postimage or authority to replay the write. A stable preimage can coexist with a delayed asynchronous write. Inspection calls no setters and never advances the journal.

This is current-state evidence without retroactive settlement of any ordinary Enable/Disable receipt. `inspect-update` still implements the prior PREVIOUS/APPLIED protocol for its specific migration UUID.

For the interrupted case, `INJECTOR_EVENT=inspect-recovery` and a fresh lowercase UUID in `INJECTOR_INSPECT_ID` use the same read-only FD9 path. It emits one line:

```text
MIUI_RECOVERY_OBSERVED <challenge> <boot> <CHECKPOINT|TARGET|DIVERGED> <journal-sha256> <migration-sha256> <observed-pair-sha256> <proposed-pair-sha256> <hide-count> <show-count> <read-ms>
```

Both matching images are observations. TARGET is the checkpoint with only recorded owned entries removed, preserving the order of all other entries. Pair digests use the journal's ordered, length-prefixed UTF-16 list encoding. The pending journal does not encode which setter was outstanding. A matching target or checkpoint therefore leaves the old dispatch status unresolved.

For a reviewed code-only Update, set `INJECTOR_EVENT=inspect-update`, `INJECTOR_RECOVERY_HANDOFF=1` and an exact fresh lowercase UUID in `INJECTOR_UPDATE_ID`. This selects the same FD9 read-only path. It will print exactly `REPAIRABLE <UUID>\n` if the current boot and migration match, the enabled pending journal has the observed partial-restore shape (owned HIDE remains, SHOW ownership is empty), and the stable live pair equals CHECKPOINT or TARGET. Divergence and unstable reads fail. The candidate's predecessor pin is the published universal ZIP above. With an approved host code-only handoff, preserve the installation state lineage and approval, suppress refresh, and preserve all historical receipts. `REPAIRABLE` supplies no setter or journal-finalization admission. A later explicit Disable still needs independently proved settlement of the old one-way dispatch and fresh readback. The candidate's normal Disable continues to reject pending journals.

## Handoff and timing

The host binds a fresh challenge to the exact candidate payload, original installation generation, state lineage, current boot and approval under its own claim. The journal contains a boot identity and migration UUID; it does not encode Injector's installation generation. The plugin lock excludes workers that have reached it. Future host admission also needs to exclude a delayed worker that has not yet reached that lock. A durable per-request permit or conclusive prior termination is a separate host condition before any fresh explicit mutation. Older unfenced and interrupted operations remain unresolved.

Mutating paths now report whether they reached worker start, inventory, apply, or restore. These markers locate a last observed phase; they cannot identify the killer. `read-ms` measures the Java inspection itself, including its journal and controller checks, and excludes staging, shell guards and process startup. Record total monotonic invocation time separately if measuring on an authorized device. No handset comparison or language speedup is claimed. Java keeps the existing named framework bridge. There is no Rust port of this bridge in this change.

`TxnTest` adds source fixtures for read-only ACTIVE/INACTIVE proof across two apply/restore cycles, migration compatibility, missing/stale/drifted state and a lost acknowledgement leaving pending bytes unchanged. It also exercises CHECKPOINT, TARGET, and DIVERGED without setters or journal changes. The tracked release JAR and checksum remain the released bytes. This source change requires a separately authorized build and independent verification before delivery.

## Small review build

From this plugin directory in the isolated source worktree, an authorized owner can build just the bridge with the existing Android SDK. The commands only create an ignored scratch output directory. They leave tracked JAR, checksum, package assets and app builds alone.

```sh
set -eu
sdk=${ANDROID_HOME:-/home/a/.android/sdk}
platform="$sdk/platforms/android-36/android.jar"
mkdir -p ../../.tmp
out=$(mktemp -d ../../.tmp/miui-readonly.XXXXXXXX)
mkdir "$out/classes" "$out/dex"
javac --release 8 -cp "$platform" -d "$out/classes" \
    ActivityLists.java Inventory.java PackageChanges.java ParcelCapacity.java Txn.java
"$sdk/build-tools/36.0.0/d8" --min-api 29 --lib "$platform" --output "$out/dex" "$out/classes/"*.class
python3 - "$out" <<'PY'
from pathlib import Path
import sys
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
out = Path(sys.argv[1])
with ZipFile(out / "activity-lists.jar", "x") as archive:
    member = ZipInfo("classes.dex")
    member.external_attr = 0o100644 << 16
    archive.writestr(member, (out / "dex/classes.dex").read_bytes(), compress_type=ZIP_DEFLATED)
PY
(cd "$out" && sha256sum activity-lists.jar > payload.sha256)
printf '%s\n' "$out"
```

For a handset check after the benign path is reviewed, use the reviewed wrapper and exact fresh bridge/checksum in a private immutable stage, with the existing installation's state directory. Use `inspect-recovery` only, with a fresh challenge and a bounded existing authorized invocation. Compare both journal hashes before and after. Skip rather than bootstrap an absent state or lock, retry a denied backend, or switch to a mutating event.
