# Current-state inspection

The installed universal release is `ef7858ef77304dc6553287a381ef3e2b90244fcf`, tag `plugins-20261122-miui-universal-1`, ZIP SHA-256 `8261ed1a1df0d164fa6f951041614156d4c50921d9534cb86ac9e82ea3b4b337`. Its shell launches the Java framework bridge through app_process. The released universal wrapper has no internal timeout. Phone Disable 452 and Enable 454 both report exit 137 and `Killed`. The retained results do not identify why, or at which phase the process was killed.

## Candidate protocol

A reviewed matching build exposes `INJECTOR_EVENT=inspect-state` and a fresh lowercase UUID in `INJECTOR_INSPECT_ID`. Success prints this exact one-line shape with a newline:

```text
MIUI_STATE <challenge> <boot> <ACTIVE|INACTIVE> <journal-sha256> <read-ms>
```

The wrapper requires the already-authorized caller and same framework and payload checks as the installed release. It opens the existing regular controller lock read-only and takes it nonblocking. The candidate must already be staged with a readable, immutable bridge; inspection never copies it into the journal directory, creates that directory or opens the lock for writing. Keep the bridge and wrapper together from the reviewed candidate. An unsupported image, denied access, unavailable lock or malformed response is inconclusive.

Both positive states require a settled same-boot journal and two exact ordered reads of both controller lists matching its saved image. ACTIVE requires a verified active journal. INACTIVE requires a settled inactive journal with no remaining owned entries. Missing, stale-boot, malformed, pending, reconciling, migration-inconsistent and externally changed states produce no positive proof. An old TXN2 pending bit carries only the pre-dispatch checkpoint. The newer TXN3 pending journal also carries the intended write. A stable preimage can coexist with a delayed asynchronous write. Inspection calls no setters and never advances the journal.

This is current-state evidence without retroactive settlement of any ordinary Enable/Disable receipt. `inspect-update` still implements the prior PREVIOUS/APPLIED protocol for its specific migration UUID.

For the interrupted case, `INJECTOR_EVENT=inspect-recovery` and a fresh lowercase UUID in `INJECTOR_INSPECT_ID` use the same read-only FD9 path. It emits one line:

```text
MIUI_RECOVERY_OBSERVED <challenge> <boot> <CHECKPOINT|TARGET|DIVERGED> <journal-sha256> <migration-sha256> <observed-pair-sha256> <proposed-pair-sha256> <hide-count> <show-count> <read-ms>
```

Both matching images are observations. TARGET is the checkpoint with only recorded owned entries removed, preserving the order of all other entries. Pair digests use the journal's ordered, length-prefixed UTF-16 list encoding. The pending journal does not encode which setter was outstanding. A matching target or checkpoint therefore leaves the old dispatch status unresolved.

For a reviewed code-only Update, set `INJECTOR_EVENT=inspect-update`, `INJECTOR_RECOVERY_HANDOFF=1` and an exact fresh lowercase UUID in `INJECTOR_UPDATE_ID`. This selects the same FD9 read-only path. It will print exactly `REPAIRABLE <UUID>\n` if the current boot and migration match, the enabled pending journal has the observed partial-restore shape (HIDE has saved ownership, SHOW ownership is empty), and the stable live pair equals CHECKPOINT or TARGET. Divergence and unstable reads fail this inspection. The candidate's predecessor pin is the published universal ZIP above. With an approved host code-only handoff, preserve the state lineage, approval and all historical receipts, and suppress refresh.

## Fresh explicit Disable

Under FD9, explicit Disable revalidates the same-boot migration and legacy TXN2 partial-restore shape. It computes TARGET by removing the recorded ownership from the saved checkpoint, then requires stable live values matching TARGET before saving an inactive journal with empty ownership. This step sends zero setters. CHECKPOINT can still have a queued HIDE restore. CHECKPOINT, DIVERGED and unstable observations retain the pending journal. The read-only code handoff and explicit Disable have separate admission checks. A later explicit Enable after successful Disable takes its baseline from current values.

## Interrupted new writes

Before each ordinary setter the hook saves and syncs a TXN3 pending record with the preimage, ownership, request direction, affected field and intended afterimage. Between fields, TXN4 records a confirmed checkpoint and its direction. Automatic refresh can resume a confirmed Enable-direction checkpoint of an already enabled installation. Disable-direction and older directionless intermediate checkpoints require an explicit request. Terminal TXN2 journals and the migration marker retain their existing formats.

A fresh explicit request uses stable reads under FD9. If the affected field matches its intended afterimage, the hook adopts that step and plans the request from current values, including external entries in the unaffected list. A preimage or a different field value retains the TXN3 journal and issues zero setters. A setter failure proven to precede dispatch can save a confirmed checkpoint. Scheduled refresh and read-only inspection leave pending writes unresolved. A new boot discards old ownership. Disable on the new boot saves the observed pair as its inactive baseline.

The reviewed vendor Binder setters are one-way. The service delegates to an adapter that replaces each list under its own monitor, and its synchronous getters can observe a list before a queued setter runs. The hook uses bounded post-dispatch read-back and stops on observed drift. The vendor API provides whole-list replacement with no compare-and-set. This preserves observed external entries without guaranteeing isolation from a concurrent writer between the final check and the setter. The saved inactive image and the success of this fresh Disable are current-state evidence. Historical Enable/Disable receipts retain their original outcomes.

## Explicit Restore and scheduled refresh

In Injector `05f8331`, Restore changes captures the installation and receipt revision, creates a fresh UI request key, and calls `restoreChanges`. With current approval, the runtime submits Disable with that key. A prior unknown or failed Disable and an available installation claim can therefore lead to another explicit invocation of the same Disable hook. A new key identifies a new user request. It supplies no evidence about the first Binder setter.

Normal explicit Disable also persists a stop marker before dispatch. While that marker exists, the host excludes boot candidates and rejects interval scheduling and delivery, including after restart. The direction stored in TXN4 protects the plugin if called independently with a partial restore. The host fixture `PluginRefreshOptOutTest` exercises restart suppression and the explicit Restore menu action.

`BridgeDisableTest` executes the bridge event dispatcher with a fake controller. The first Disable restores SHOW and queues HIDE with a lost reply. A second explicit Disable retains both journal and cursor and issues zero setters. Once the original HIDE is delivered, another explicit Disable records INACTIVE with zero setters. These host checks cover event routing and recovery logic. Device transport and package identity require separate qualification.

## Handoff and timing

The host binds a fresh challenge to the exact candidate payload, original installation generation, state lineage, current boot and approval under its own claim. The journal contains a boot identity and migration UUID; it does not encode Injector's installation generation. The plugin lock excludes workers that have reached it. Future host admission also needs to exclude a delayed worker that has not yet reached that lock. A durable per-request permit or conclusive prior termination is a separate host condition before any fresh explicit mutation. Older unfenced and interrupted operations remain unresolved.

Mutating paths now report whether they reached worker start, inventory, apply, or restore. These markers locate a last observed phase; they cannot identify the killer. `read-ms` measures the Java inspection itself, including its journal and controller checks, and excludes staging, shell guards and process startup. Record total monotonic invocation time separately if measuring on an authorized device. No handset comparison or language speedup is claimed. Java keeps the existing named framework bridge. There is no Rust port of this bridge in this change.

Host fixtures cover queued one-way writes, late afterimages, interruption after either field, restore-direction admission, directionless legacy checkpoints, boot-local ownership, external values and read-only inspection. The tests use isolated state directories. Run `bash verify.sh` to include the cursor and wrapper lock regressions.

## Bridge identity

The universal release at `ef7858ef` contains JAR SHA-256 `b706828c4925a10a70c23fda5890a7ced7650a313b4d7435d1902b561b67cd61`. The tracked review candidate from `6390eef`, also present at `72ff6bd`, contains JAR SHA-256 `9f3f4c665c87f2cd6ef84a3130d50b18950b945d08ec033a1f500a6c1c3cce22`. Both hashes refer to the JAR inside the package. This source revision requires a new owner-built JAR and checksum before staging the updated recovery behavior.

## Small review build

From this plugin directory, run the focused pure Java journal fixture with an isolated output and a new empty journal directory:

```sh
set -eu
out=$(mktemp -d "${TMPDIR:-/tmp}/miui-txn.XXXXXXXX")
mkdir "$out/classes" "$out/journal"
javac --release 8 -d "$out/classes" Txn.java TxnTest.java
java -cp "$out/classes" TxnTest "$out/journal"
```

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
