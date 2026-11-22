import java.io.*;
import java.nio.file.*;
import java.util.*;

public final class TxnTest {
    private static final String HIDE = "hide_self";
    private static final String SHOW = "show_hidden";
    private static final String BOOT = "boot";
    private static final String NEXT_BOOT = "next-boot";
    private static final String ID = "update-42";
    private static final String JOURNAL = "txn.journal";
    private static final String UPDATE = "txn-update.journal";
    private static final String SHARED = "stock.Shared";
    private static final List<String> LEGACY_NAMES = Arrays.asList("old.Alias", SHARED, "old.Target");
    private static final List<String> BASE_HIDE = Arrays.asList(null, SHARED, SHARED, "\ud800");
    private static final List<String> BASE_SHOW = Arrays.asList("stock.Show", "old.Alias");
    private static final List<String> DECLARED = Arrays.asList("new.Z", "new.A", SHARED, "new.A");

    private interface Action { void run() throws Exception; }
    private static final class WorkerDied extends Error {}

    static final class Host implements Txn.IO {
        final Path dir;
        final Map<String, List<String>> values = new HashMap<>();
        final List<String> calls = new ArrayList<>();
        final List<List<List<String>>> postWrites = new ArrayList<>();
        byte[] expectLegacy;
        int reads;
        int writes;
        int attempts;
        int rejectOn;
        int unknownBeforeOn;
        int queueOn;
        String queuedField;
        List<String> queuedValue;
        int loseReplyOn;
        int killAfterWriteOn;
        int driftOn;
        int failReadBeforeSecond;
        int hideReadsAfterFirst;
        boolean driftBeforeSecond;
        String failPreflight;
        List<String> foreignShow;

        Host(Path root, String name) throws IOException {
            dir = Files.createDirectory(root.resolve(name));
            values.put(HIDE, new ArrayList<>(BASE_HIDE));
            values.put(SHOW, new ArrayList<>(BASE_SHOW));
        }

        public List<String> read(String field) throws IOException {
            reads++;
            if (writes == 1 && HIDE.equals(field)) {
                hideReadsAfterFirst++;
                if (hideReadsAfterFirst == failReadBeforeSecond) {
                    throw new IOException("One read failed before second dispatch");
                }
                if (hideReadsAfterFirst == 4 && driftBeforeSecond) values.put(SHOW, new ArrayList<>(foreignShow));
            }
            return new ArrayList<>(values.get(field));
        }

        public void preflight(String field, List<String> value) throws IOException {
            calls.add("preflight " + field);
            if (field.equals(failPreflight)) throw new IOException("Rejected target size");
        }

        public void set(String field, List<String> value) throws IOException {
            if (expectLegacy != null) {
                sameBytes(expectLegacy, Files.readAllBytes(dir.resolve(JOURNAL)));
                containsBytes(Files.readAllBytes(dir.resolve(UPDATE)), expectLegacy);
            }
            calls.add("set " + field);
            attempts++;
            if (attempts == rejectOn) {
                throw new Txn.WriteRejectedException("Binder rejected before dispatch");
            }
            if (attempts == queueOn) {
                queuedField = field;
                queuedValue = new ArrayList<>(value);
                throw new IOException("Queued one-way setter, reply lost");
            }
            if (attempts == unknownBeforeOn) throw new IOException("Binder outcome unknown");
            values.put(field, new ArrayList<>(value));
            writes++;
            if (writes == driftOn) values.put(SHOW, new ArrayList<>(foreignShow));
            postWrites.add(pair());
            if (writes == killAfterWriteOn) throw new WorkerDied();
            if (writes == loseReplyOn) throw new IOException("Lost setter reply");
        }

        List<List<String>> pair() {
            return Arrays.asList(new ArrayList<>(values.get(HIDE)), new ArrayList<>(values.get(SHOW)));
        }

        byte[] legacy(String boot, int mask, int pending, boolean complete) throws IOException {
            Path journal = dir.resolve(JOURNAL);
            try (DataOutputStream out = new DataOutputStream(Files.newOutputStream(journal))) {
                out.writeInt(0x54584e31);
                out.writeUTF(boot);
                legacyList(out, LEGACY_NAMES);
                legacyList(out, BASE_HIDE);
                legacyList(out, BASE_SHOW);
                out.writeByte(mask);
                out.writeByte(pending);
                out.writeBoolean(complete);
            }
            if ((mask & 1) != 0) values.put(HIDE, appendMissing(BASE_HIDE, LEGACY_NAMES));
            if ((mask & 2) != 0) values.put(SHOW, appendMissing(BASE_SHOW, LEGACY_NAMES));
            return Files.readAllBytes(journal);
        }

        void enable(String boot, List<String> selected) throws Exception {
            Txn.run(dir, boot, "enable", selected, this);
        }

        void disable(String boot) throws Exception {
            Txn.run(dir, boot, "disable", null, this);
        }

        void configure() throws Exception {
            Txn.configure(dir, BOOT, ID, DECLARED, this);
        }

        void oldPendingDisable() throws Exception {
            legacy(BOOT, 3, 0, true);
            configure();
            values.put(SHOW, new ArrayList<>(BASE_SHOW));
            List<String> ownedHide = new ArrayList<>(values.get(HIDE));
            ownedHide.removeAll(BASE_HIDE);
            try (DataOutputStream out = new DataOutputStream(Files.newOutputStream(dir.resolve(JOURNAL)))) {
                out.writeInt(0x54584e32);
                out.writeUTF(BOOT);
                out.writeUTF(ID);
                legacyList(out, values.get(HIDE));
                legacyList(out, values.get(SHOW));
                legacyList(out, ownedHide);
                legacyList(out, Collections.emptyList());
                out.writeBoolean(true);
                out.writeBoolean(true);
                out.writeBoolean(true);
            }
        }

        String inspect(String boot, String id) throws Exception {
            return Txn.inspectUpdate(dir, boot, id, this);
        }
    }

    private static List<String> appendMissing(List<String> base, List<String> extra) {
        List<String> result = new ArrayList<>(base);
        for (String name : extra) if (!result.contains(name)) result.add(name);
        return result;
    }

    private static void legacyList(DataOutputStream out, List<String> names) throws IOException {
        out.writeInt(names.size());
        for (String name : names) {
            out.writeInt(name == null ? -1 : name.length());
            if (name != null) out.writeChars(name);
        }
    }

    private static void expect(Object expected, Object actual) {
        if (!Objects.equals(expected, actual)) throw new AssertionError(expected + " != " + actual);
    }

    private static void sameBytes(byte[] expected, byte[] actual) {
        if (!Arrays.equals(expected, actual)) throw new AssertionError("File bytes changed");
    }

    private static void containsBytes(byte[] all, byte[] part) {
        for (int offset = 0; offset <= all.length - part.length; offset++) {
            int i = 0;
            while (i < part.length && all[offset + i] == part[i]) i++;
            if (i == part.length) return;
        }
        throw new AssertionError("Update journal lacks the exact legacy journal bytes");
    }

    private static void refused(Action action) throws Exception {
        try {
            action.run();
        } catch (IOException expected) {
            return;
        }
        throw new AssertionError("Expected refusal");
    }

    private static void exactCutoverAndRefresh(Path root) throws Exception {
        Host h = new Host(root, "cutover");
        byte[] legacy = h.legacy(BOOT, 3, 0, true);
        List<List<String>> before = h.pair();
        expect("PREVIOUS", h.inspect(BOOT, ID));
        sameBytes(legacy, Files.readAllBytes(h.dir.resolve(JOURNAL)));
        expect(false, Files.exists(h.dir.resolve(UPDATE)));

        Host noChange = new Host(root, "cutover-no-write");
        noChange.legacy(BOOT, 3, 0, true);
        List<List<String>> prior = noChange.pair();
        Txn.configure(noChange.dir, BOOT, ID, LEGACY_NAMES, noChange);
        expect(Collections.emptyList(), noChange.calls);
        expect(prior, noChange.pair());
        expect("APPLIED", noChange.inspect(BOOT, ID));
        Txn.requireEnabled(noChange.dir);
        refused(() -> Txn.requireEnabled(h.dir));
        refused(() -> Txn.checkActive(h.dir, BOOT, h));
        refused(() -> h.enable(BOOT, DECLARED));
        refused(() -> h.disable(BOOT));
        h.expectLegacy = legacy;
        h.configure();
        h.expectLegacy = null;
        expect(Arrays.asList("preflight hide_self", "preflight show_hidden", "set hide_self", "set show_hidden"), h.calls);
        for (List<List<String>> intermediate : h.postWrites) {
            for (int i = 0; i < before.size(); i++) {
                expect(before.get(i), intermediate.get(i).subList(0, before.get(i).size()));
            }
        }
        expect(appendMissing(before.get(0), Arrays.asList("new.A", "new.Z")), h.values.get(HIDE));
        expect(appendMissing(before.get(1), Arrays.asList(SHARED, "new.A", "new.Z")), h.values.get(SHOW));
        Txn.requireEnabled(h.dir);
        Txn.checkActive(h.dir, BOOT, h);
        byte[] active = Files.readAllBytes(h.dir.resolve(JOURNAL));
        byte[] update = Files.readAllBytes(h.dir.resolve(UPDATE));
        expect("APPLIED", h.inspect(BOOT, ID));
        refused(() -> h.inspect(BOOT, "other-id"));
        refused(() -> h.inspect(NEXT_BOOT, ID));
        refused(h::configure);
        sameBytes(active, Files.readAllBytes(h.dir.resolve(JOURNAL)));
        sameBytes(update, Files.readAllBytes(h.dir.resolve(UPDATE)));
        expect(2, h.writes);

        h.values.get(HIDE).add(1, "foreign.ThirdParty");
        h.values.get(SHOW).add(0, "foreign.Changed");
        h.values.get(SHOW).remove("new.Z");
        refused(() -> h.inspect(BOOT, ID));
        refused(() -> Txn.checkActive(h.dir, BOOT, h));
        Txn.requireEnabled(h.dir);
        h.enable(BOOT, Arrays.asList("new.UpdatedAlias", SHARED, "new.A"));
        expect(Arrays.asList(null, "foreign.ThirdParty", SHARED, SHARED, "\ud800",
                "new.A", "new.UpdatedAlias"), h.values.get(HIDE));
        expect(Arrays.asList("foreign.Changed", "stock.Show", "old.Alias",
                SHARED, "new.A", "new.UpdatedAlias"), h.values.get(SHOW));
        int stableWrites = h.writes;
        h.enable(BOOT, Arrays.asList("new.A", SHARED, "new.UpdatedAlias", "new.A"));
        expect(stableWrites, h.writes);
        Txn.checkActive(h.dir, BOOT, h);

        h.calls.clear();
        h.disable(BOOT);
        expect(Arrays.asList("preflight hide_self", "preflight show_hidden", "set show_hidden", "set hide_self"), h.calls);
        expect(Arrays.asList(null, "foreign.ThirdParty", SHARED, SHARED, "\ud800"), h.values.get(HIDE));
        expect(Arrays.asList("foreign.Changed", "stock.Show", "old.Alias"), h.values.get(SHOW));
        refused(() -> Txn.requireEnabled(h.dir));
        refused(() -> Txn.checkActive(h.dir, BOOT, h));
        int disabledWrites = h.writes;
        h.disable(BOOT);
        expect(disabledWrites, h.writes);
    }

    private static void refusedLegacyAndPreflight(Path root) throws Exception {
        Host absent = new Host(root, "absent");
        refused(absent::configure);
        refused(() -> absent.inspect(BOOT, ID));
        refused(() -> Txn.requireEnabled(absent.dir));
        absent.disable(BOOT);
        expect(0, absent.reads);

        for (int caseNo = 0; caseNo < 5; caseNo++) {
            Host h = new Host(root, "invalid-" + caseNo);
            byte[] legacy = h.legacy(caseNo == 0 ? NEXT_BOOT : BOOT, caseNo == 1 ? 1 : 3,
                    caseNo == 2 ? 1 : 0, caseNo != 3);
            if (caseNo == 4) h.values.get(HIDE).add("foreign.Extra");
            refused(h::configure);
            refused(() -> h.inspect(BOOT, ID));
            sameBytes(legacy, Files.readAllBytes(h.dir.resolve(JOURNAL)));
            expect(Collections.emptyList(), h.calls);
            expect(false, Files.exists(h.dir.resolve(UPDATE)));
        }

        Host h = new Host(root, "preflight");
        byte[] legacy = h.legacy(BOOT, 3, 0, true);
        h.failPreflight = SHOW;
        refused(h::configure);
        expect(Arrays.asList("preflight hide_self", "preflight show_hidden"), h.calls);
        expect("PREVIOUS", h.inspect(BOOT, ID));
        sameBytes(legacy, Files.readAllBytes(h.dir.resolve(JOURNAL)));
        expect(false, Files.exists(h.dir.resolve(UPDATE)));
    }

    private static void rollbackAndUnknown(Path root) throws Exception {
        Host h = new Host(root, "known-failure");
        byte[] legacy = h.legacy(BOOT, 3, 0, true);
        List<List<String>> previous = h.pair();
        h.expectLegacy = legacy;
        h.failReadBeforeSecond = 4;
        refused(h::configure);
        expect(previous, h.pair());
        expect(2, h.writes);
        sameBytes(legacy, Files.readAllBytes(h.dir.resolve(JOURNAL)));
        expect("PREVIOUS", h.inspect(BOOT, ID));
        String fresh = "fresh-uuid";
        byte[] previousMarker = Files.readAllBytes(h.dir.resolve(UPDATE));
        expect("PREVIOUS", h.inspect(BOOT, fresh));
        sameBytes(previousMarker, Files.readAllBytes(h.dir.resolve(UPDATE)));
        h.values.get(SHOW).add("foreign.Changed");
        refused(() -> h.inspect(BOOT, fresh));
        h.values.put(SHOW, previous.get(1));
        Files.write(h.dir.resolve(JOURNAL), new byte[]{0}, StandardOpenOption.APPEND);
        refused(() -> h.inspect(BOOT, fresh));
        Files.write(h.dir.resolve(JOURNAL), legacy);
        refused(() -> h.inspect(NEXT_BOOT, ID));
        refused(() -> h.inspect(NEXT_BOOT, fresh));
        refused(h::configure);
        expect(2, h.writes);
        expect("PREVIOUS", h.inspect(BOOT, fresh));
        Txn.configure(h.dir, BOOT, fresh, DECLARED, h);
        expect("APPLIED", h.inspect(BOOT, fresh));
        refused(() -> h.inspect(BOOT, ID));
        expect(4, h.writes);

        for (int position : Arrays.asList(1, 2)) {
            Host rejected = new Host(root, "rejected-" + position);
            byte[] old = rejected.legacy(BOOT, 3, 0, true);
            List<List<String>> prior = rejected.pair();
            rejected.expectLegacy = old;
            rejected.rejectOn = position;
            refused(rejected::configure);
            if (position == 1) {
                expect(Arrays.asList("preflight hide_self", "preflight show_hidden", "set hide_self"),
                        rejected.calls);
                expect(0, rejected.writes);
            } else {
                expect(Arrays.asList("preflight hide_self", "preflight show_hidden", "set hide_self",
                        "set show_hidden", "preflight hide_self", "set hide_self"), rejected.calls);
                expect(2, rejected.writes);
            }
            expect(prior, rejected.pair());
            sameBytes(old, Files.readAllBytes(rejected.dir.resolve(JOURNAL)));
            expect("PREVIOUS", rejected.inspect(BOOT, ID));
            expect("PREVIOUS", rejected.inspect(BOOT, "fresh-uuid"));
        }

        for (int position : Arrays.asList(1, 2, 3, 4)) {
            Host u = new Host(root, "unknown-" + position);
            byte[] old = u.legacy(BOOT, 3, 0, true);
            List<List<String>> prior = u.pair();
            u.expectLegacy = old;
            if (position < 3) {
                u.loseReplyOn = position;
            } else if (position == 3) {
                u.driftOn = 1;
                u.foreignShow = Arrays.asList("foreign.MustKeep");
            } else {
                u.unknownBeforeOn = 1;
            }
            refused(u::configure);
            if (position == 3) expect(u.foreignShow, u.values.get(SHOW));
            int writes = position == 4 ? 0 : position == 3 ? 1 : position;
            expect(writes, u.writes);
            byte[] marker = Files.readAllBytes(u.dir.resolve(UPDATE));
            refused(() -> u.inspect(BOOT, ID));
            refused(() -> u.inspect(BOOT, "fresh-uuid"));
            u.values.put(HIDE, prior.get(0));
            u.values.put(SHOW, prior.get(1));
            refused(() -> u.inspect(BOOT, ID));
            refused(() -> u.inspect(BOOT, "fresh-uuid"));
            refused(() -> Txn.requireEnabled(u.dir));
            refused(() -> u.enable(BOOT, DECLARED));
            refused(() -> u.disable(BOOT));
            refused(() -> u.enable(NEXT_BOOT, DECLARED));
            refused(() -> u.disable(NEXT_BOOT));
            refused(() -> Txn.configure(u.dir, BOOT, "new-id", DECLARED, u));
            sameBytes(old, Files.readAllBytes(u.dir.resolve(JOURNAL)));
            sameBytes(marker, Files.readAllBytes(u.dir.resolve(UPDATE)));
            expect(writes, u.writes);
        }

        Host changed = new Host(root, "known-first-write-foreign-drift");
        byte[] old = changed.legacy(BOOT, 3, 0, true);
        changed.driftBeforeSecond = true;
        changed.foreignShow = Collections.singletonList("foreign.Changed");
        refused(changed::configure);
        expect(1, changed.writes);
        expect(changed.foreignShow, changed.values.get(SHOW));
        sameBytes(old, Files.readAllBytes(changed.dir.resolve(JOURNAL)));
        refused(() -> changed.inspect(BOOT, ID));

        Host rollbackUnknown = new Host(root, "unknown-rollback");
        byte[] rollbackLegacy = rollbackUnknown.legacy(BOOT, 3, 0, true);
        List<List<String>> prior = rollbackUnknown.pair();
        rollbackUnknown.rejectOn = 2;
        rollbackUnknown.loseReplyOn = 2;
        refused(rollbackUnknown::configure);
        expect(prior, rollbackUnknown.pair());
        expect(2, rollbackUnknown.writes);
        sameBytes(rollbackLegacy, Files.readAllBytes(rollbackUnknown.dir.resolve(JOURNAL)));
        refused(() -> rollbackUnknown.inspect(BOOT, ID));
    }

    private static void resumeConfirmedRefresh(Path root) throws Exception {
        for (boolean rejected : Arrays.asList(false, true)) {
            Host h = new Host(root, "refresh-interrupted-" + rejected);
            h.enable(BOOT, DECLARED);
            h.writes = 0;
            h.attempts = 0;
            h.hideReadsAfterFirst = 0;
            h.calls.clear();
            if (rejected) h.rejectOn = 2;
            else h.failReadBeforeSecond = 4;
            List<String> desired = Collections.singletonList("new.Replacement");
            List<String> originalShow = new ArrayList<>(h.values.get(SHOW));
            refused(() -> h.enable(BOOT, desired));
            expect(1, h.writes);
            expect(appendMissing(BASE_HIDE, desired), h.values.get(HIDE));
            expect(originalShow, h.values.get(SHOW));
            int reads = h.reads;
            Txn.requireEnabled(h.dir);
            refused(() -> Txn.checkActive(h.dir, BOOT, h));
            expect(reads, h.reads);
            h.calls.clear();
            h.enable(BOOT, desired);
            expect(Arrays.asList("preflight show_hidden", "set show_hidden"), h.calls);
            expect(appendMissing(BASE_HIDE, desired), h.values.get(HIDE));
            expect(appendMissing(BASE_SHOW, desired), h.values.get(SHOW));
            expect(2, h.writes);
            Txn.requireEnabled(h.dir);
            Txn.checkActive(h.dir, BOOT, h);
        }
    }

    private static void refreshConflictsAndBoot(Path root) throws Exception {
        Host h = new Host(root, "fresh");
        h.enable(BOOT, DECLARED);
        Txn.requireEnabled(h.dir);
        Txn.checkActive(h.dir, BOOT, h);
        h.values.get(HIDE).add("new.A");
        int applied = h.writes;
        refused(() -> h.enable(BOOT, DECLARED));
        refused(() -> h.disable(BOOT));
        expect(applied, h.writes);
        h.values.get(HIDE).remove(h.values.get(HIDE).size() - 1);
        h.values.put(HIDE, new ArrayList<>(Arrays.asList("foreign.Reset", SHARED)));
        h.enable(BOOT, DECLARED);
        expect(Arrays.asList("foreign.Reset", SHARED, "new.A", "new.Z"), h.values.get(HIDE));

        refused(() -> Txn.checkActive(h.dir, NEXT_BOOT, h));
        Txn.requireEnabled(h.dir);
        h.values.put(HIDE, new ArrayList<>(Arrays.asList("new.Z", "new.Z", "foreign.Boot")));
        h.values.put(SHOW, new ArrayList<>(Collections.singletonList("foreign.BootShow")));
        h.enable(NEXT_BOOT, Collections.singletonList("new.A"));
        expect(Arrays.asList("new.Z", "new.Z", "foreign.Boot", "new.A"), h.values.get(HIDE));
        h.disable(NEXT_BOOT);
        expect(Arrays.asList("new.Z", "new.Z", "foreign.Boot"), h.values.get(HIDE));
        expect(Collections.singletonList("foreign.BootShow"), h.values.get(SHOW));
        refused(() -> Txn.requireEnabled(h.dir));

        Host ambiguous = new Host(root, "refresh-unknown");
        ambiguous.enable(BOOT, DECLARED);
        ambiguous.loseReplyOn = 3;
        refused(() -> ambiguous.enable(BOOT, Collections.singletonList("new.B")));
        refused(() -> Txn.requireEnabled(ambiguous.dir));
        ambiguous.disable(BOOT);
        expect(5, ambiguous.writes);
        expect(Arrays.asList(BASE_HIDE, BASE_SHOW), ambiguous.pair());
        ambiguous.disable(NEXT_BOOT);
        expect(5, ambiguous.writes);
        refused(() -> Txn.requireEnabled(ambiguous.dir));
    }

    private static void expectReadOnlyProof(Host h, String state) throws Exception {
        Path journal = h.dir.resolve(JOURNAL);
        Path marker = h.dir.resolve(UPDATE);
        byte[] before = Files.readAllBytes(journal);
        byte[] update = Files.exists(marker) ? Files.readAllBytes(marker) : null;
        List<String> calls = new ArrayList<>(h.calls);
        String proof = Txn.inspectState(h.dir, BOOT, h);
        if (!proof.matches(state + " [0-9a-f]{64}")) throw new AssertionError(proof);
        expect(calls, h.calls);
        sameBytes(before, Files.readAllBytes(journal));
        if (update != null) sameBytes(update, Files.readAllBytes(marker));
    }

    private static void lifecycleProofAndRepeatCycles(Path root) throws Exception {
        Host h = new Host(root, "lifecycle-proof");
        refused(() -> Txn.inspectState(h.dir, BOOT, h));
        for (int cycle = 0; cycle < 2; cycle++) {
            h.enable(BOOT, DECLARED);
            expectReadOnlyProof(h, "ACTIVE");
            h.disable(BOOT);
            expectReadOnlyProof(h, "INACTIVE");
            expect(Arrays.asList(BASE_HIDE, BASE_SHOW), h.pair());
        }
        expect(8, h.writes);
        refused(() -> Txn.inspectState(h.dir, NEXT_BOOT, h));
        h.values.get(HIDE).add("foreign.New");
        refused(() -> Txn.inspectState(h.dir, BOOT, h));
        expect(8, h.writes);

        Host migrated = new Host(root, "migrated-proof");
        migrated.legacy(BOOT, 3, 0, true);
        expectReadOnlyProof(migrated, "ACTIVE");
        migrated.configure();
        expectReadOnlyProof(migrated, "ACTIVE");
        migrated.disable(BOOT);
        expectReadOnlyProof(migrated, "INACTIVE");

        Host interrupted = new Host(root, "interrupted-proof");
        interrupted.loseReplyOn = 1;
        refused(() -> interrupted.enable(BOOT, DECLARED));
        byte[] pending = Files.readAllBytes(interrupted.dir.resolve(JOURNAL));
        refused(() -> Txn.inspectState(interrupted.dir, BOOT, interrupted));
        sameBytes(pending, Files.readAllBytes(interrupted.dir.resolve(JOURNAL)));
        expect(1, interrupted.writes);
    }

    private static void inspectPartialRestore(Path root) throws Exception {
        Host h = new Host(root, "partial-restore-proof");
        h.oldPendingDisable();
        List<List<String>> enabled = h.pair();
        h.values.put(HIDE, new ArrayList<>(BASE_HIDE));
        expect(Arrays.asList(BASE_HIDE, BASE_SHOW), h.pair());

        Path journal = h.dir.resolve(JOURNAL);
        Path marker = h.dir.resolve(UPDATE);
        byte[] pending = Files.readAllBytes(journal);
        byte[] migration = Files.readAllBytes(marker);
        List<String> calls = new ArrayList<>(h.calls);
        refused(() -> Txn.inspectState(h.dir, BOOT, h));
        refused(() -> Txn.inspectRecovery(h.dir, NEXT_BOOT, h));
        expect("TARGET", Txn.inspectRecovery(h.dir, BOOT, h).split(" ")[0]);
        Txn.requireRepairable(h.dir, BOOT, h);

        h.values.put(HIDE, enabled.get(0));
        expect("CHECKPOINT", Txn.inspectRecovery(h.dir, BOOT, h).split(" ")[0]);
        Txn.requireRepairable(h.dir, BOOT, h);

        h.values.get(SHOW).add("foreign.New");
        expect("DIVERGED", Txn.inspectRecovery(h.dir, BOOT, h).split(" ")[0]);
        refused(() -> Txn.requireRepairable(h.dir, BOOT, h));
        expect(calls, h.calls);
        sameBytes(pending, Files.readAllBytes(journal));
        sameBytes(migration, Files.readAllBytes(marker));

        h.values.put(HIDE, new ArrayList<>(BASE_HIDE));
        h.values.put(SHOW, new ArrayList<>(BASE_SHOW));
        refused(() -> h.enable(BOOT, DECLARED));
        h.disable(BOOT);
        expect(calls, h.calls);
        expectReadOnlyProof(h, "INACTIVE");
        byte[] inactive = Files.readAllBytes(journal);
        h.disable(BOOT);
        expect(calls, h.calls);
        sameBytes(inactive, Files.readAllBytes(journal));
        sameBytes(migration, Files.readAllBytes(marker));
        h.enable(BOOT, DECLARED);
        expectReadOnlyProof(h, "ACTIVE");
        h.disable(BOOT);
        expectReadOnlyProof(h, "INACTIVE");
        expect(Arrays.asList(BASE_HIDE, BASE_SHOW), h.pair());
    }

    private static void legacyQueuedRestore(Path root) throws Exception {
        Host h = new Host(root, "legacy-queued-restore");
        h.oldPendingDisable();
        Path journal = h.dir.resolve(JOURNAL);
        Path marker = h.dir.resolve(UPDATE);
        byte[] pending = Files.readAllBytes(journal);
        byte[] migration = Files.readAllBytes(marker);
        int attempts = h.attempts;
        refused(() -> h.disable(BOOT)); // The original HIDE restore could still be queued.
        h.values.get(HIDE).add("new.A");
        refused(() -> h.disable(BOOT));
        h.values.get(HIDE).remove(h.values.get(HIDE).size() - 1);
        h.values.get(SHOW).add("foreign.Show");
        refused(() -> h.disable(BOOT));
        h.values.put(HIDE, new ArrayList<>(BASE_HIDE));
        refused(() -> h.disable(BOOT));
        sameBytes(pending, Files.readAllBytes(journal));
        expect(true, h.values.get(SHOW).contains("foreign.Show"));

        h.values.put(SHOW, new ArrayList<>(BASE_SHOW));
        h.disable(BOOT);
        expectReadOnlyProof(h, "INACTIVE");
        expect(attempts, h.attempts);
        sameBytes(migration, Files.readAllBytes(marker));
    }

    private static void interruptedOrdinaryWrites(Path root) throws Exception {
        for (boolean enable : Arrays.asList(false, true)) {
            for (int boundary = 1; boundary <= 2; boundary++) {
                Host h = new Host(root, "ordinary-kill-" + enable + "-" + boundary);
                if (!enable) h.enable(BOOT, DECLARED);
                Action request = enable ? () -> h.enable(BOOT, DECLARED) : () -> h.disable(BOOT);
                int initialWrites = h.writes;
                h.killAfterWriteOn = initialWrites + boundary;
                try {
                    request.run();
                    throw new AssertionError("Expected simulated worker death");
                } catch (WorkerDied expected) {
                    expect(initialWrites + boundary, h.writes);
                }
                Path journal = h.dir.resolve(JOURNAL);
                byte[] pending = Files.readAllBytes(journal);
                expect(0x54584e33, new DataInputStream(new ByteArrayInputStream(pending)).readInt());
                refused(() -> Txn.inspectState(h.dir, BOOT, h));
                refused(() -> Txn.requireEnabled(h.dir));
                sameBytes(pending, Files.readAllBytes(journal));
                if (boundary == 1) {
                    h.failPreflight = enable ? SHOW : HIDE;
                    refused(request);
                    expect(initialWrites + 1, h.writes);
                    byte[] checkpoint = Files.readAllBytes(journal);
                    expect(0x54584e34, new DataInputStream(new ByteArrayInputStream(checkpoint)).readInt());
                    h.failPreflight = null;
                }
                request.run();
                expect(initialWrites + 2, h.writes);
                expectReadOnlyProof(h, enable ? "ACTIVE" : "INACTIVE");
                h.disable(BOOT);
                expect(Arrays.asList(BASE_HIDE, BASE_SHOW), h.pair());
                h.enable(BOOT, DECLARED);
                h.disable(BOOT);
                expectReadOnlyProof(h, "INACTIVE");
                expect(Arrays.asList(BASE_HIDE, BASE_SHOW), h.pair());
            }
        }
    }

    private static void queuedPendingPreimage(Path root) throws Exception {
        for (boolean enable : Arrays.asList(false, true)) {
            Host h = new Host(root, "ordinary-queued-" + enable);
            if (!enable) h.enable(BOOT, DECLARED);
            Action request = enable ? () -> h.enable(BOOT, DECLARED) : () -> h.disable(BOOT);
            int first = h.attempts + 1;
            h.queueOn = first;
            refused(request);
            Path journal = h.dir.resolve(JOURNAL);
            byte[] pending = Files.readAllBytes(journal);
            refused(request);
            if (enable) {
                refused(() -> h.disable(BOOT));
                refused(() -> h.enable(BOOT, Collections.singletonList("new.Changed")));
            } else {
                refused(() -> h.enable(BOOT, DECLARED));
            }
            h.values.get(h.queuedField).add("foreign.Drift");
            refused(request);
            h.values.get(h.queuedField).remove("foreign.Drift");
            refused(() -> Txn.requireEnabled(h.dir));
            expect(first, h.attempts);
            sameBytes(pending, Files.readAllBytes(journal));

            // Complete the original queued operation. The fresh request needs only the other field.
            String other = enable ? SHOW : HIDE;
            h.values.get(other).add("foreign.WhileQueued");
            h.values.put(h.queuedField, h.queuedValue);
            request.run();
            expect(first + 1, h.attempts);
            expect(true, h.values.get(other).contains("foreign.WhileQueued"));
            expectReadOnlyProof(h, enable ? "ACTIVE" : "INACTIVE");
        }
    }

    private static void interruptedDisableAdmission(Path root) throws Exception {
        for (boolean rejected : Arrays.asList(false, true)) {
            Host h = new Host(root, "interrupted-disable-" + rejected);
            h.enable(BOOT, DECLARED);
            h.writes = 0;
            h.hideReadsAfterFirst = 0;
            if (rejected) h.rejectOn = h.attempts + 2;
            else h.failReadBeforeSecond = 4; // Stop after the first confirmed field was saved.
            refused(() -> h.disable(BOOT));
            expect(BASE_SHOW, h.values.get(SHOW));
            expect(1, h.writes);
            int attempts = h.attempts;
            Path journal = h.dir.resolve(JOURNAL);
            byte[] checkpoint = Files.readAllBytes(journal);
            refused(() -> Txn.requireEnabled(h.dir)); // Entry gate for interval, boot and Run.
            sameBytes(checkpoint, Files.readAllBytes(journal));
            expect(attempts, h.attempts);
            if (rejected) {
                // TXN2 ended with the flags and did not include the TXN4 direction byte.
                expect(0x54584e34, new DataInputStream(new ByteArrayInputStream(checkpoint)).readInt());
                byte[] legacy = Arrays.copyOf(checkpoint, checkpoint.length - 1);
                legacy[3] = 0x32;
                Files.write(journal, legacy);
                refused(() -> Txn.requireEnabled(h.dir));
                sameBytes(legacy, Files.readAllBytes(journal));
            }
            h.disable(BOOT);
            expect(attempts + 1, h.attempts);
            expectReadOnlyProof(h, "INACTIVE");
        }
    }

    private static void rebootDisableProof(Path root) throws Exception {
        Host h = new Host(root, "reboot-disable-proof");
        h.enable(BOOT, DECLARED);
        h.values.put(HIDE, Arrays.asList("new.A", "vendor.NewBoot", "vendor.NewBoot"));
        h.values.put(SHOW, Collections.singletonList("vendor.Show"));
        List<List<String>> baseline = h.pair();
        int attempts = h.attempts;
        h.disable(NEXT_BOOT);
        expect(true, Txn.inspectState(h.dir, NEXT_BOOT, h).startsWith("INACTIVE "));
        expect(baseline, h.pair());
        expect(attempts, h.attempts);
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1) throw new IllegalArgumentException("TxnTest requires an empty scratch directory");
        Path root = Paths.get(args[0]);
        exactCutoverAndRefresh(root);
        refusedLegacyAndPreflight(root);
        rollbackAndUnknown(root);
        resumeConfirmedRefresh(root);
        refreshConflictsAndBoot(root);
        lifecycleProofAndRepeatCycles(root);
        inspectPartialRestore(root);
        legacyQueuedRestore(root);
        interruptedOrdinaryWrites(root);
        queuedPendingPreimage(root);
        interruptedDisableAdmission(root);
        rebootDisableProof(root);
        System.out.println("TxnTest passed");
    }
}
