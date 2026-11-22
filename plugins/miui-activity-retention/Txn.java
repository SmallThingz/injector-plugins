import java.io.*;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.Pattern;

/** The hook must hold the same exclusive lock for the entire invocation of every entry point. */
public final class Txn {
    public interface IO {
        List<String> read(String field) throws Exception;
        void set(String field, List<String> value) throws Exception;
        default void preflight(String field, List<String> target) throws Exception {}
    }

    /** Use for a setter failure only when the adapter can prove no write was dispatched. */
    public static final class WriteRejectedException extends IOException {
        private static final long serialVersionUID = 1L;

        public WriteRejectedException(String message) { super(message); }

        public WriteRejectedException(String message, Throwable cause) { super(message, cause); }
    }

    private static final String[] FIELDS = {"hide_self", "show_hidden"};
    private static final String JOURNAL = "txn.journal";
    private static final String UPDATE = "txn-update.journal";
    private static final int TXN1 = 0x54584e31;
    private static final int TXN2 = 0x54584e32;
    private static final int TXN3 = 0x54584e33;
    private static final int TXN4 = 0x54584e34; // Confirmed intermediate checkpoint with request direction.
    private static final int UPDATE1 = 0x54585531;
    private static final int MAX_JOURNAL_BYTES = 16 * 1024 * 1024;
    private static final Pattern CLASS_NAME = Pattern.compile(
            "([\\p{javaJavaIdentifierStart}][\\p{javaJavaIdentifierPart}]*\\.)+"
            + "[\\p{javaJavaIdentifierStart}][\\p{javaJavaIdentifierPart}]*");

    private enum Direction { ENABLE, DISABLE }

    private static final class Active {
        final String boot;
        final String updateId;
        final List<List<String>> image;
        final List<List<String>> owned;
        // A pending setter may have been dispatched. A confirmed checkpoint can be reconciled.
        final boolean pending;
        final boolean enabled;
        final boolean reconciling;
        final PendingWrite write;
        // Legacy intermediate TXN2 checkpoints have no direction.
        final Direction checkpointDirection;

        Active(String boot, String updateId, List<List<String>> image, List<List<String>> owned,
               boolean pending, boolean enabled, boolean reconciling) {
            this(boot, updateId, image, owned, pending, enabled, reconciling, null, null);
        }

        Active(String boot, String updateId, List<List<String>> image, List<List<String>> owned,
               boolean pending, boolean enabled, boolean reconciling, PendingWrite write,
               Direction checkpointDirection) {
            this.boot = boot;
            this.updateId = updateId;
            this.image = image;
            this.owned = owned;
            this.pending = pending;
            this.enabled = enabled;
            this.reconciling = reconciling;
            this.write = write;
            this.checkpointDirection = checkpointDirection;
        }
    }

    private static final class PendingWrite {
        final boolean enable;
        final int field;
        final List<String> image;
        final List<String> owned;

        PendingWrite(boolean enable, int field, List<String> image, List<String> owned) {
            this.enable = enable;
            this.field = field;
            this.image = image;
            this.owned = owned;
        }
    }

    private static final class Update {
        final String boot;
        final String id;
        final byte[] legacy;
        final List<List<String>> before;
        final List<List<String>> target;
        final boolean previous;

        Update(String boot, String id, byte[] legacy, List<List<String>> before,
               List<List<String>> target, boolean previous) {
            this.boot = boot;
            this.id = id;
            this.legacy = legacy;
            this.before = before;
            this.target = target;
            this.previous = previous;
        }
    }

    public static void configure(Path dir, String boot, String updateId, List<String> declaredClasses,
                                 IO io) throws Exception {
        identity(boot, false);
        identity(updateId, false);
        Set<String> declared = classes(declaredClasses);
        Path journal = dir.resolve(JOURNAL);
        Path marker = dir.resolve(UPDATE);
        Update existing = Files.notExists(marker) ? null : readUpdate(readBytes(marker));
        if (existing != null && (!existing.previous || existing.id.equals(updateId))) {
            throw new IOException("An update already exists; inspect its outcome");
        }

        byte[] legacy = readBytes(journal);
        Active old = readLegacy(legacy, boot);
        if (existing != null && (!existing.boot.equals(boot) || !Arrays.equals(existing.legacy, legacy)
                || !existing.before.equals(old.image))) {
            throw new IOException("Previous update no longer matches the legacy state");
        }
        requireCurrent(io, old.image);

        // Keep the exact legacy postimage as a prefix throughout cutover.
        for (List<String> owned : old.owned) declared.addAll(owned);
        Active target = plan(old, old.image, declared, true);
        preflight(io, old.image, target.image);
        requireCurrent(io, old.image);
        Update update = new Update(boot, updateId, legacy, old.image, target.image, false);
        saveUpdate(marker, update);

        List<List<String>> current = old.image;
        for (int i = 0; i < FIELDS.length; i++) {
            if (current.get(i).equals(target.image.get(i))) continue;
            checkBeforeConfigureWrite(journal, marker, update, current, io);
            List<List<String>> after = replace(current, i, target.image.get(i));
            try {
                dispatch(io, i, after);
            } catch (WriteRejectedException rejected) {
                recoverKnownFailure(journal, marker, update, current, io, rejected);
                throw rejected;
            }
            verifyWrite(io, i, current, after);
            current = after;
        }
        checkBeforeConfigureWrite(journal, marker, update, current, io);
        saveActive(journal, new Active(boot, updateId, current, target.owned, false, true, false));
    }

    /** Returns a terminal proof for this ID. A lost or partially observed write stays unresolved. */
    public static String inspectUpdate(Path dir, String boot, String updateId, IO io) throws Exception {
        identity(boot, false);
        identity(updateId, false);
        Path marker = dir.resolve(UPDATE);
        byte[] journal = readBytes(dir.resolve(JOURNAL));
        if (Files.notExists(marker)) {
            Active legacy = readLegacy(journal, boot);
            requireCurrent(io, legacy.image);
            return "PREVIOUS";
        }
        Update update = readUpdate(readBytes(marker));
        if (!update.boot.equals(boot)) throw new IOException("Update boot mismatch");
        // A terminal rollback can also prove the pre-dispatch state for a fresh update ID.
        if (update.previous && Arrays.equals(update.legacy, journal)) {
            requireCurrent(io, update.before);
            return "PREVIOUS";
        }
        if (!update.id.equals(updateId)) throw new IOException("Update identity mismatch");
        if (!update.previous && magic(journal) == TXN2) {
            Active active = readActive(journal);
            if (active.enabled && !active.reconciling && active.boot.equals(boot) && active.updateId.equals(updateId)
                    && active.image.equals(update.target)) {
                requireCurrent(io, update.target);
                return "APPLIED";
            }
        }
        throw new IOException("Update outcome is unresolved");
    }

    /** Existing inspect-update/Configure handoff for a code successor, under the caller's FD9.
     * Null selects the original TXN1 migration protocol, including inspection of its own token. */
    static String codeUpdate(Path dir, String boot, String token, String pluginDir, IO io, boolean configure)
            throws Exception {
        byte[] journal = regularBytes(dir.resolve(JOURNAL));
        int version = magic(journal);
        if (version == TXN1) return null;
        if (version != TXN2) throw new IOException("Code update requires a settled transaction");
        Active active = readActive(journal);
        if (active.updateId.equals(token)) return null;
        if (!active.enabled || active.pending || active.reconciling || !active.boot.equals(boot))
            throw new IOException("Code update requires same-boot ACTIVE state");

        Path markerPath = dir.resolve(UPDATE);
        byte[] marker = new byte[0];
        if (!Files.notExists(markerPath, LinkOption.NOFOLLOW_LINKS)) {
            marker = regularBytes(markerPath);
            Update update = readUpdate(marker);
            if (update.previous || !update.id.equals(active.updateId))
                throw new IOException("Migration outcome is unresolved");
        } else if (!active.updateId.isEmpty()) {
            throw new IOException("Migration journal is missing");
        }

        if (pluginDir == null || !Paths.get(pluginDir).isAbsolute() || Paths.get(pluginDir).getFileName() == null)
            throw new IOException("Missing staged generation");
        String generation = Paths.get(pluginDir).getFileName().toString();
        canonicalUuid(boot);
        canonicalUuid(generation);
        canonicalUuid(token);
        // Fixed-width ASCII record, including the digest of an absent (empty) marker.
        String expected = String.join("\n", "MCU1", boot, generation, token, digest(journal), digest(marker));
        Path path = dir.resolve("activity-code-update.receipt");
        boolean applied = false;
        if (!Files.notExists(path, LinkOption.NOFOLLOW_LINKS)) {
            if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) || Files.size(path) != expected.length())
                throw new IOException("Invalid code update receipt");
            String saved = new String(regularBytes(path), StandardCharsets.US_ASCII);
            String[] fields = saved.split("\n", -1);
            if (fields.length != 6 || !fields[0].equals("MCU1")
                    || !fields[4].matches("[a-f0-9]{64}") || !fields[5].matches("[a-f0-9]{64}"))
                throw new IOException("Invalid code update receipt");
            canonicalUuid(fields[1]);
            canonicalUuid(fields[2]);
            canonicalUuid(fields[3]);
            applied = saved.equals(expected);
            if (!applied && (generation.equals(fields[2]) || token.equals(fields[3])))
                throw new IOException("Code update receipt does not match this operation or state");
        }

        requireCurrent(io, active.image);
        if (applied) return "APPLIED";
        if (!configure) return "PREVIOUS";
        save(path, out -> out.write(expected.getBytes(StandardCharsets.US_ASCII)));
        return "APPLIED";
    }

    private static void canonicalUuid(String value) throws IOException {
        try {
            if (value != null && UUID.fromString(value).toString().equals(value)) return;
        } catch (IllegalArgumentException invalid) {
            // Never echo strings read from a malformed receipt.
        }
        throw new IOException("Invalid code update identity");
    }

    /** Current controller proof. An unresolved operation cannot supply a terminal proof. */
    public static String inspectState(Path dir, String boot, IO io) throws Exception {
        identity(boot, false);
        Path journal = dir.resolve(JOURNAL);
        Path marker = dir.resolve(UPDATE);
        if (!Files.isRegularFile(journal, LinkOption.NOFOLLOW_LINKS))
            throw new IOException("No regular transaction journal");
        boolean hasMarker = !Files.notExists(marker, LinkOption.NOFOLLOW_LINKS);
        if (hasMarker && !Files.isRegularFile(marker, LinkOption.NOFOLLOW_LINKS))
            throw new IOException("Invalid migration journal");

        byte[] bytes = readBytes(journal);
        Active active;
        if (magic(bytes) == TXN1) {
            active = readLegacy(bytes, boot);
            if (hasMarker) {
                Update update = readUpdate(readBytes(marker));
                if (!update.previous || !update.boot.equals(boot) || !Arrays.equals(update.legacy, bytes)
                        || !update.before.equals(active.image))
                    throw new IOException("Legacy migration is unresolved");
            }
        } else {
            active = readActive(bytes);
            requireCommittedUpdate(dir, active);
        }
        if (!active.boot.equals(boot)) throw new IOException("Journal belongs to an earlier boot");
        if (active.pending || active.reconciling) throw new IOException("A previous write is unresolved");
        if (!active.enabled && active.owned.stream().anyMatch(list -> !list.isEmpty()))
            throw new IOException("Inactive journal still owns entries");
        requireCurrent(io, active.image);
        return (active.enabled ? "ACTIVE " : "INACTIVE ") + digest(bytes);
    }

    /** Compare a pending journal with live values, without resolving or advancing it. */
    public static String inspectRecovery(Path dir, String boot, IO io) throws Exception {
        return observeRecovery(dir, boot, io, false);
    }

    /** The host may use this for an explicitly reviewed code-only handoff. */
    public static void requireRepairable(Path dir, String boot, IO io) throws Exception {
        observeRecovery(dir, boot, io, true);
    }

    private static String observeRecovery(Path dir, String boot, IO io, boolean requireMatch) throws Exception {
        Recovery recovery = new Recovery(dir, boot);
        List<List<String>> proposed = recovery.legacyRestoreTarget();
        if (requireMatch) requirePartialRestore(recovery.active);
        List<List<String>> observed = stableSnapshot(io);
        String comparison = observed.equals(proposed) ? "TARGET"
                : observed.equals(recovery.active.image) ? "CHECKPOINT" : "DIVERGED";
        if (requireMatch && comparison.equals("DIVERGED"))
            throw new IOException("Live lists do not match either reviewed image");
        return comparison + " " + digest(recovery.journalBytes) + " " + digest(recovery.markerBytes)
                + " " + digestPair(observed) + " " + digestPair(proposed)
                + " " + observed.get(0).size() + " " + observed.get(1).size();
    }

    private static final class Recovery {
        final Path journal;
        final Path marker;
        final byte[] journalBytes;
        final byte[] markerBytes;
        final Active active;

        Recovery(Path dir, String boot) throws IOException {
            identity(boot, false);
            journal = dir.resolve(JOURNAL);
            marker = dir.resolve(UPDATE);
            journalBytes = regularBytes(journal);
            markerBytes = regularBytes(marker);
            active = readActive(journalBytes);
            Update update = readUpdate(markerBytes);
            if (!boot.equals(active.boot) || !boot.equals(update.boot) || update.previous
                    || !active.updateId.equals(update.id))
                throw new IOException("Pending checkpoint does not match the current migration and boot");
        }

        List<List<String>> legacyRestoreTarget() throws IOException {
            if (!active.pending || !active.reconciling || active.write != null)
                throw new IOException("Expected a pending legacy checkpoint");
            return plan(active, active.image, Collections.emptySet(), false).image;
        }

        void requireUnchanged() throws IOException {
            if (!Arrays.equals(journalBytes, regularBytes(journal))
                    || !Arrays.equals(markerBytes, regularBytes(marker)))
                throw new IOException("Recovery journals changed during inventory");
        }
    }

    /** Fresh host-admitted Enable following a stopped-code handoff. Caller holds FD9 throughout. */
    static int enableFromRestoreTarget(Path dir, String boot, InventorySource inventory, IO io)
            throws Exception {
        Recovery recovery = new Recovery(dir, boot);
        Active active = recovery.active;
        Active baseline;
        if (!active.enabled && active.write != null && active.write.enable) {
            // A queued new setter must already have produced its entire ordered afterimage.
            baseline = confirmedWrite(active, active.write);
        } else if ((!active.enabled && active.checkpointDirection == Direction.ENABLE)
                || (active.enabled && !active.pending && !active.reconciling)) {
            baseline = active;
        } else {
            requirePartialRestore(active);
            // The legacy restore target contains only external entries. Never inherit its old ownership.
            baseline = new Active(boot, active.updateId, recovery.legacyRestoreTarget(), emptyPair(),
                    false, false, false);
        }
        requireCurrent(io, baseline.image);
        List<String> declared = inventory.classes();
        if (declared.isEmpty()) throw new IOException("Empty current-user activity inventory");
        Set<String> desired = classes(declared);
        for (List<String> owned : baseline.owned) {
            if (!desired.containsAll(owned)) throw new IOException("Recovery would remove owned entries");
        }
        requireCurrent(io, baseline.image);
        recovery.requireUnchanged();
        Active target = plan(baseline, baseline.image, desired, true);
        if (!active.pending && !active.reconciling) {
            if (!target.image.equals(active.image)) throw new IOException("Settled inventory changed");
        } else {
            applyPlan(recovery.journal, baseline, baseline.image, target, true, io);
        }
        return declared.size();
    }

    private static String digestPair(List<List<String>> pair) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (DataOutputStream out = new DataOutputStream(bytes)) {
            writePair(out, pair);
        }
        return digest(bytes.toByteArray());
    }

    private static String digest(byte[] bytes) throws Exception {
        StringBuilder hex = new StringBuilder(64);
        for (byte value : MessageDigest.getInstance("SHA-256").digest(bytes)) {
            hex.append(Character.forDigit((value & 0xff) >>> 4, 16));
            hex.append(Character.forDigit(value & 0xf, 16));
        }
        return hex.toString();
    }

    private static void checkBeforeConfigureWrite(Path journal, Path marker, Update update,
                                                  List<List<String>> current, IO io) throws Exception {
        try {
            requireCurrent(io, current);
        } catch (Exception failure) {
            recoverKnownFailure(journal, marker, update, current, io, failure);
            throw failure;
        }
    }

    private static void recoverKnownFailure(Path journal, Path marker, Update update,
                                            List<List<String>> current, IO io, Exception failure) {
        try {
            restorePrevious(journal, marker, update, current, io);
        } catch (Exception rollbackFailure) {
            failure.addSuppressed(rollbackFailure);
        }
    }

    private static void restorePrevious(Path journal, Path marker, Update update,
                                        List<List<String>> current, IO io) throws Exception {
        if (!Arrays.equals(readBytes(journal), update.legacy)) throw new IOException("Legacy journal changed");
        requireCurrent(io, current);
        preflight(io, current, update.before);
        for (int i = FIELDS.length - 1; i >= 0; i--) {
            if (current.get(i).equals(update.before.get(i))) continue;
            requireCurrent(io, current);
            List<List<String>> after = replace(current, i, update.before.get(i));
            dispatch(io, i, after);
            verifyWrite(io, i, current, after);
            current = after;
        }
        requireCurrent(io, update.before);
        saveUpdate(marker, new Update(update.boot, update.id, update.legacy, update.before, update.target, true));
    }

    public static void run(Path dir, String boot, String event, List<String> declaredClasses, IO io) throws Exception {
        runWithInventory(dir, boot, event, () -> declaredClasses, io);
    }

    interface InventorySource {
        List<String> classes() throws Exception;
    }

    static int runWithInventory(Path dir, String boot, String event, InventorySource inventory, IO io)
            throws Exception {
        identity(boot, false);
        boolean enable = "enable".equals(event);
        if (!enable && !"disable".equals(event)) throw new IllegalArgumentException("Unknown event");
        Path journal = dir.resolve(JOURNAL);
        Active state = null;
        if (!Files.notExists(journal)) {
            byte[] bytes = readBytes(journal);
            if (magic(bytes) == TXN1) throw new IOException("Legacy installation requires explicit configure");
            state = readActive(bytes);
        }
        Update migration = requireCommittedUpdate(dir, state);
        if (state == null && !enable) return 0;
        boolean sameBoot = state != null && boot.equals(state.boot);
        if (sameBoot && state.pending && state.write == null) {
            if (enable || migration == null || !boot.equals(migration.boot)
                    || !Files.isRegularFile(journal, LinkOption.NOFOLLOW_LINKS)
                    || !Files.isRegularFile(dir.resolve(UPDATE), LinkOption.NOFOLLOW_LINKS)) {
                throw new IOException("A previous write is unresolved");
            }
            reconcilePendingDisable(journal, state, io);
            return 0;
        }
        // A same-boot legacy pending write already rules out Enable, regardless of installed apps.
        List<String> declared = enable ? inventory.classes() : Collections.emptyList();
        Set<String> desired = classes(declared);
        String updateId = state == null ? "" : state.updateId;
        boolean wasEnabled = state != null && state.enabled;
        List<List<String>> current = stableSnapshot(io);
        if (!sameBoot && !enable) {
            // Ownership is boot-local. An old journal conveys no ownership over a new boot's lists.
            saveActive(journal, new Active(boot, updateId, current, emptyPair(), false, false, false));
            return 0;
        }

        if (!sameBoot) state = new Active(boot, updateId, current, emptyPair(), false, wasEnabled, false);
        if (state.write != null) {
            state = reconcileWrite(journal, state, current);
            current = stableSnapshot(io);
        }
        applyPlan(journal, state, current, plan(state, current, desired, enable), !sameBoot, io);
        return declared.size();
    }

    private static void applyPlan(Path journal, Active state, List<List<String>> current,
                                  Active target, boolean forceSave, IO io) throws Exception {
        boolean enable = target.enabled;
        preflight(io, current, target.image);
        Files.createDirectories(journal.getParent());
        List<List<String>> owned = new ArrayList<>();
        for (int i = 0; i < FIELDS.length; i++) {
            List<String> retained = new ArrayList<>(state.owned.get(i));
            retained.retainAll(new HashSet<>(current.get(i)));
            owned.add(retained);
        }
        Active saved = state;
        Direction direction = enable ? Direction.ENABLE : Direction.DISABLE;
        for (int step = 0; step < FIELDS.length; step++) {
            int i = enable ? step : FIELDS.length - 1 - step;
            if (current.get(i).equals(target.image.get(i))) {
                owned.set(i, target.owned.get(i));
                continue;
            }
            Active before = new Active(state.boot, state.updateId, current, new ArrayList<>(owned), false,
                    state.enabled, true, null, direction);
            PendingWrite write = new PendingWrite(enable, i, target.image.get(i), target.owned.get(i));
            saved = writeField(journal, before, write, io);
            current = saved.image;
            owned.set(i, target.owned.get(i));
        }
        requireCurrent(io, target.image);
        if (forceSave || saved.reconciling || saved.enabled != enable || !saved.image.equals(target.image)
                || !saved.owned.equals(target.owned)) {
            saveActive(journal, target);
        }
    }

    private static void requirePartialRestore(Active active) throws IOException {
        if (!active.enabled || !active.reconciling || active.owned.get(0).isEmpty()
                || !active.owned.get(1).isEmpty()) {
            throw new IOException("Checkpoint does not match the partial restore shape");
        }
    }

    private static void reconcilePendingDisable(Path journal, Active state, IO io) throws Exception {
        requirePartialRestore(state);
        List<List<String>> current = stableSnapshot(io);
        Active target = plan(state, state.image, Collections.emptySet(), false);
        if (!current.equals(target.image))
            throw new IOException("Pending legacy restore requires the observed target");
        requireCurrent(io, target.image);
        saveActive(journal, target);
    }

    private static Active reconcileWrite(Path journal, Active state, List<List<String>> current)
            throws IOException {
        PendingWrite write = state.write;
        List<String> observed = current.get(write.field);
        if (observed.equals(state.image.get(write.field))) {
            // The one-way setter may still be queued even after repeated reads of the preimage.
            throw new IOException("Awaiting confirmed afterimage for " + FIELDS[write.field]);
        }
        if (!observed.equals(write.image))
            throw new IOException("Pending write differs from both saved images for " + FIELDS[write.field]);
        Active checkpoint = confirmedWrite(state, write);
        saveActive(journal, checkpoint);
        return checkpoint;
    }

    private static Active writeField(Path journal, Active before, PendingWrite write, IO io) throws Exception {
        List<List<String>> current = before.image;
        requireCurrent(io, current);
        saveActive(journal, new Active(before.boot, before.updateId, before.image, before.owned,
                true, before.enabled, true, write, null));
        List<List<String>> after = replace(current, write.field, write.image);
        boolean attempted = false;
        try {
            requireCurrent(io, current);
            attempted = true;
            dispatch(io, write.field, after);
        } catch (Exception failure) {
            if (!attempted || failure instanceof WriteRejectedException) {
                try {
                    saveActive(journal, before);
                } catch (IOException checkpointFailure) {
                    failure.addSuppressed(checkpointFailure);
                }
            }
            throw failure;
        }
        verifyWrite(io, write.field, current, after);
        Active checkpoint = confirmedWrite(before, write);
        saveActive(journal, checkpoint);
        return checkpoint;
    }

    private static Active confirmedWrite(Active before, PendingWrite write) {
        return new Active(before.boot, before.updateId, replace(before.image, write.field, write.image),
                replace(before.owned, write.field, write.owned), false, before.enabled, true, null,
                write.enable ? Direction.ENABLE : Direction.DISABLE);
    }

    private static Update requireCommittedUpdate(Path dir, Active active) throws IOException {
        Path marker = dir.resolve(UPDATE);
        if (!Files.notExists(marker)) {
            Update update = readUpdate(readBytes(marker));
            if (active == null || update.previous || !update.id.equals(active.updateId)) {
                throw new IOException("Migration outcome is unresolved");
            }
            return update;
        } else if (active != null && !active.updateId.isEmpty()) {
            throw new IOException("Migration journal is missing");
        }
        return null;
    }

    private static Active readEnabled(Path dir) throws IOException {
        Active active = readActive(readBytes(dir.resolve(JOURNAL)));
        requireCommittedUpdate(dir, active);
        if (active.pending || !active.enabled) throw new IOException("Transaction is not fully enabled");
        if (active.reconciling && active.checkpointDirection != Direction.ENABLE)
            throw new IOException("Explicit request required after interrupted restore or unknown direction");
        return active;
    }

    /** Gate the manual run hook before package enumeration, including on a new boot. */
    public static void requireEnabled(Path dir) throws IOException {
        readEnabled(dir);
    }

    public static void checkActive(Path dir, String boot, IO io) throws Exception {
        Active active = readEnabled(dir);
        if (!active.boot.equals(boot)) throw new IOException("Boot changed");
        if (active.reconciling) throw new IOException("Refresh has unfinished fields");
        requireCurrent(io, active.image);
    }

    private static Active plan(Active state, List<List<String>> current, Set<String> desired,
                               boolean enabled) throws IOException {
        List<List<String>> images = new ArrayList<>();
        List<List<String>> ownership = new ArrayList<>();
        for (int i = 0; i < FIELDS.length; i++) {
            Set<String> wasOwned = new HashSet<>(state.owned.get(i));
            Set<String> seenOwned = new HashSet<>();
            List<String> image = new ArrayList<>();
            List<String> owned = new ArrayList<>();
            for (String entry : current.get(i)) {
                if (wasOwned.contains(entry)) {
                    if (!seenOwned.add(entry)) throw new IOException("Ambiguous owned occurrence in " + FIELDS[i]);
                    if (!desired.contains(entry)) continue;
                    owned.add(entry);
                }
                image.add(entry);
            }
            Set<String> present = new HashSet<>(image);
            for (String name : desired) {
                if (!present.add(name)) continue;
                image.add(name);
                owned.add(name);
            }
            images.add(image);
            ownership.add(owned);
        }
        return new Active(state.boot, state.updateId, images, ownership, false, enabled, false);
    }

    private static List<List<String>> snapshot(IO io) throws Exception {
        return Arrays.asList(new ArrayList<>(io.read(FIELDS[0])), new ArrayList<>(io.read(FIELDS[1])));
    }

    private static List<List<String>> stableSnapshot(IO io) throws Exception {
        List<List<String>> pair = snapshot(io);
        if (!pair.equals(snapshot(io))) throw new IOException("Lists changed during readback");
        return pair;
    }

    private static void requireCurrent(IO io, List<List<String>> expected) throws Exception {
        if (!stableSnapshot(io).equals(expected)) throw new IOException("Lists changed externally");
    }

    private static void preflight(IO io, List<List<String>> before, List<List<String>> after) throws Exception {
        for (int i = 0; i < FIELDS.length; i++) {
            if (!before.get(i).equals(after.get(i))) io.preflight(FIELDS[i], new ArrayList<>(after.get(i)));
        }
    }

    private static void dispatch(IO io, int i, List<List<String>> after) throws Exception {
        io.set(FIELDS[i], new ArrayList<>(after.get(i)));
    }

    private static void verifyWrite(IO io, int i, List<List<String>> before, List<List<String>> after)
            throws Exception {
        for (int attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) Thread.sleep(25);
            List<List<String>> observed = snapshot(io);
            if (observed.equals(after)) {
                requireCurrent(io, after);
                return;
            }
            if (!observed.equals(before)) break;
        }
        throw new IOException("Unconfirmed write to " + FIELDS[i]);
    }

    private static List<List<String>> replace(List<List<String>> pair, int i, List<String> list) {
        List<List<String>> result = new ArrayList<>(pair);
        result.set(i, list);
        return result;
    }

    private static List<List<String>> emptyPair() {
        return Arrays.asList(Collections.emptyList(), Collections.emptyList());
    }

    private static Set<String> classes(List<String> input) {
        Set<String> result = new TreeSet<>();
        for (String name : input) {
            if (name == null || !CLASS_NAME.matcher(name).matches()) {
                throw new IllegalArgumentException("Expected qualified class name");
            }
            result.add(name);
        }
        return result;
    }

    private static void identity(String value, boolean emptyAllowed) throws IOException {
        if (value == null || (!emptyAllowed && value.isEmpty()) || value.length() > 256) {
            throw new IOException("Invalid boot or update identity");
        }
    }

    private static Active readLegacy(byte[] bytes, String boot) throws IOException {
        try (DataInputStream in = stream(bytes)) {
            if (in.readInt() != TXN1 || !in.readUTF().equals(boot)) {
                throw new IOException("Expected a same-boot legacy journal");
            }
            List<String> selected = readList(in);
            if (classes(selected).size() != selected.size()) throw new IOException("Invalid legacy selection");
            List<List<String>> original = readPair(in);
            int mask = in.readUnsignedByte();
            int pending = in.readByte();
            int complete = in.readUnsignedByte();
            end(in);
            if (mask > 3 || pending != 0 || complete != 1) throw new IOException("Legacy update is incomplete");
            List<List<String>> image = new ArrayList<>();
            List<List<String>> owned = new ArrayList<>();
            for (int i = 0; i < FIELDS.length; i++) {
                List<String> additions = new ArrayList<>();
                Set<String> present = new HashSet<>(original.get(i));
                for (String name : selected) if (present.add(name)) additions.add(name);
                if (!additions.isEmpty() && (mask & (1 << i)) == 0) {
                    throw new IOException("Legacy journal lacks an applied postimage");
                }
                List<String> list = new ArrayList<>(original.get(i));
                list.addAll(additions);
                image.add(list);
                owned.add(additions);
            }
            return new Active(boot, "", image, owned, false, true, false);
        } catch (IllegalArgumentException e) {
            throw new IOException("Invalid legacy journal", e);
        }
    }

    private static Active readActive(byte[] bytes) throws IOException {
        try (DataInputStream in = stream(bytes)) {
            int version = in.readInt();
            if (version != TXN2 && version != TXN3 && version != TXN4) throw new IOException("Unknown transaction journal");
            String boot = in.readUTF();
            String id = in.readUTF();
            identity(boot, false);
            identity(id, true);
            List<List<String>> image = readPair(in);
            List<List<String>> owned = readPair(in);
            int pending = in.readUnsignedByte();
            int enabled = in.readUnsignedByte();
            int reconciling = in.readUnsignedByte();
            if (pending > 1 || enabled > 1 || reconciling > 1 || (pending == 1 && reconciling == 0)) {
                throw new IOException("Invalid transaction state");
            }
            for (int i = 0; i < FIELDS.length; i++) {
                checkOwnership(image.get(i), owned.get(i));
            }
            Direction direction = null;
            if (version == TXN4) {
                int operation = in.readUnsignedByte();
                if (pending != 0 || reconciling != 1 || operation > 1)
                    throw new IOException("Invalid confirmed checkpoint");
                direction = operation == 1 ? Direction.ENABLE : Direction.DISABLE;
            }
            PendingWrite write = null;
            if (version == TXN3) {
                int operation = in.readUnsignedByte();
                int field = in.readUnsignedByte();
                if (pending != 1 || operation > 1 || field >= FIELDS.length) {
                    throw new IOException("Invalid pending write identity");
                }
                List<String> after = readList(in);
                List<String> afterOwned = readList(in);
                checkOwnership(after, afterOwned);
                if (after.equals(image.get(field)) || (operation == 0 && !afterOwned.isEmpty())
                        || !unowned(after, afterOwned).equals(unowned(image.get(field), owned.get(field)))) {
                    throw new IOException("Invalid pending afterimage");
                }
                write = new PendingWrite(operation == 1, field, after, afterOwned);
            }
            end(in);
            return new Active(boot, id, image, owned, pending == 1, enabled == 1, reconciling == 1, write, direction);
        } catch (IllegalArgumentException e) {
            throw new IOException("Invalid transaction journal", e);
        }
    }

    private static void checkOwnership(List<String> image, List<String> owned) throws IOException {
        if (classes(owned).size() != owned.size()) throw new IOException("Invalid ownership");
        Set<String> seen = new HashSet<>();
        Set<String> keys = new HashSet<>(owned);
        for (String name : image) {
            if (keys.contains(name) && !seen.add(name)) throw new IOException("Duplicate ownership");
        }
        if (!seen.equals(keys)) throw new IOException("Ownership missing from journal image");
    }

    private static List<String> unowned(List<String> image, List<String> owned) {
        List<String> result = new ArrayList<>(image);
        result.removeAll(new HashSet<>(owned));
        return result;
    }

    private static Update readUpdate(byte[] bytes) throws IOException {
        try (DataInputStream in = stream(bytes)) {
            if (in.readInt() != UPDATE1) throw new IOException("Unknown update journal");
            String boot = in.readUTF();
            String id = in.readUTF();
            identity(boot, false);
            identity(id, false);
            int count = in.readInt();
            if (count < 4 || count > in.available()) throw new IOException("Invalid legacy journal length");
            byte[] legacy = new byte[count];
            in.readFully(legacy);
            List<List<String>> before = readPair(in);
            List<List<String>> target = readPair(in);
            int previous = in.readUnsignedByte();
            end(in);
            if (previous > 1 || !readLegacy(legacy, boot).image.equals(before)) {
                throw new IOException("Invalid update state");
            }
            for (int i = 0; i < FIELDS.length; i++) {
                List<String> original = before.get(i);
                List<String> result = target.get(i);
                if (result.size() < original.size() || !result.subList(0, original.size()).equals(original)) {
                    throw new IOException("Update does not preserve the legacy postimage");
                }
                Set<String> present = new HashSet<>(original);
                for (String name : result.subList(original.size(), result.size())) {
                    if (name == null || !CLASS_NAME.matcher(name).matches() || !present.add(name)) {
                        throw new IOException("Invalid update addition");
                    }
                }
            }
            return new Update(boot, id, legacy, before, target, previous == 1);
        }
    }

    private static void saveActive(Path path, Active active) throws IOException {
        save(path, out -> {
            out.writeInt(active.write != null ? TXN3 : active.checkpointDirection != null ? TXN4 : TXN2);
            out.writeUTF(active.boot);
            out.writeUTF(active.updateId);
            writePair(out, active.image);
            writePair(out, active.owned);
            out.writeBoolean(active.pending);
            out.writeBoolean(active.enabled);
            out.writeBoolean(active.reconciling);
            if (active.checkpointDirection != null) out.writeBoolean(active.checkpointDirection == Direction.ENABLE);
            if (active.write != null) {
                out.writeBoolean(active.write.enable);
                out.writeByte(active.write.field);
                writeList(out, active.write.image);
                writeList(out, active.write.owned);
            }
        });
    }

    private static void saveUpdate(Path path, Update update) throws IOException {
        save(path, out -> {
            out.writeInt(UPDATE1);
            out.writeUTF(update.boot);
            out.writeUTF(update.id);
            out.writeInt(update.legacy.length);
            out.write(update.legacy);
            writePair(out, update.before);
            writePair(out, update.target);
            out.writeBoolean(update.previous);
        });
    }

    private interface Encoder { void write(DataOutputStream out) throws IOException; }

    private static void save(Path path, Encoder encoder) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try (DataOutputStream out = new DataOutputStream(buffer)) {
            encoder.write(out);
        }
        if (buffer.size() > MAX_JOURNAL_BYTES) throw new IOException("Transaction journal is too large");
        Path file = Files.createTempFile(path.getParent(), ".txn-", ".tmp");
        try {
            try (FileOutputStream out = new FileOutputStream(file.toFile())) {
                buffer.writeTo(out);
                out.getFD().sync();
            }
            Files.move(file, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            try (FileChannel channel = FileChannel.open(path.getParent(), StandardOpenOption.READ)) {
                channel.force(true);
            }
        } finally {
            Files.deleteIfExists(file);
        }
    }

    private static byte[] regularBytes(Path path) throws IOException {
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS))
            throw new IOException("Expected regular transaction file");
        return readBytes(path);
    }

    private static byte[] readBytes(Path path) throws IOException {
        if (Files.size(path) > MAX_JOURNAL_BYTES) throw new IOException("Transaction journal is too large");
        return Files.readAllBytes(path);
    }

    private static DataInputStream stream(byte[] bytes) {
        return new DataInputStream(new ByteArrayInputStream(bytes));
    }

    private static int magic(byte[] bytes) throws IOException {
        return stream(bytes).readInt();
    }

    private static void end(DataInputStream in) throws IOException {
        if (in.read() != -1) throw new IOException("Unexpected journal data");
    }

    private static void writePair(DataOutputStream out, List<List<String>> pair) throws IOException {
        for (List<String> list : pair) writeList(out, list);
    }

    private static void writeList(DataOutputStream out, List<String> list) throws IOException {
        out.writeInt(list.size());
        for (String value : list) {
            out.writeInt(value == null ? -1 : value.length());
            if (value != null) out.writeChars(value);
        }
    }

    private static List<List<String>> readPair(DataInputStream in) throws IOException {
        return Arrays.asList(readList(in), readList(in));
    }

    private static List<String> readList(DataInputStream in) throws IOException {
        int count = in.readInt();
        if (count < 0 || count > in.available() / Integer.BYTES) throw new IOException("Invalid list length");
        List<String> result = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            int length = in.readInt();
            if (length < -1 || length > in.available() / Character.BYTES) throw new IOException("Invalid string length");
            if (length == -1) {
                result.add(null);
                continue;
            }
            StringBuilder value = new StringBuilder(length);
            for (int j = 0; j < length; j++) value.append(in.readChar());
            result.add(value.toString());
        }
        return result;
    }
}
