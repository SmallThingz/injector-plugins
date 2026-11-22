import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import java.util.*;

public final class CodeUpdateTest {
    private static final String BOOT = "38dbc44a-275f-4a97-8b1f-1a597938efaa";
    private static final String TOKEN = "68f00000-eefa-41ad-af53-000000000539";
    private static final String NEXT = "68f00000-eefa-41ad-af53-000000000567";
    private static final String NEXT_DIR = "/stage/138e0000-ada1-4a14-a534-000000000002";
    private static final List<String> NAMES = Arrays.asList("new.A", "stock.Shared");

    interface Action { void run() throws Exception; }
    private static void check(boolean ok) { if (!ok) throw new AssertionError(); }
    private static void refused(Action action) throws Exception {
        try { action.run(); } catch (IOException expected) { return; }
        throw new AssertionError("Expected refusal");
    }

    // Verify the exact proof text consumed by liveUpdateProof, and forbid entry to package enumeration.
    private static String dispatch(TxnTest.Host h, String event, String token) throws Exception {
        PrintStream prior = System.out;
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (PrintStream capture = new PrintStream(output, true, "UTF-8")) {
            System.setOut(capture);
            ActivityLists.execute(event, h.dir, token, BOOT, h, (e, d, u, b) -> {
                throw new AssertionError("Entered package inventory");
            });
        } finally { System.setOut(prior); }
        return output.toString("UTF-8");
    }

    public static void main(String[] args) throws Exception {
        Path root = Paths.get(args[0]);
        TxnTest.Host h = new TxnTest.Host(root, "active-code-handoff");
        h.legacy(BOOT, 3, 0, true);
        check(dispatch(h, "inspect-update", TOKEN).equals("PREVIOUS " + TOKEN + "\n"));
        Txn.configure(h.dir, BOOT, "legacy-token", NAMES, h);
        check(dispatch(h, "inspect-update", "legacy-token").equals("APPLIED legacy-token\n"));
        Path txn = h.dir.resolve("txn.journal"), txu = h.dir.resolve("txn-update.journal");
        Path receipt = h.dir.resolve("activity-code-update.receipt");
        byte[] journal = Files.readAllBytes(txn), migration = Files.readAllBytes(txu);
        String proof = Txn.inspectState(h.dir, BOOT, h);
        int attempts = h.attempts;
        List<List<String>> pair = h.pair();
        check(dispatch(h, "inspect-update", TOKEN).equals("PREVIOUS " + TOKEN + "\n"));
        check(Files.notExists(receipt));
        h.values.get("show_hidden").add("foreign.Drift");
        refused(() -> dispatch(h, "configure", TOKEN));
        check(Files.notExists(receipt));
        h.values.get("show_hidden").remove("foreign.Drift");
        check(dispatch(h, "configure", TOKEN).isEmpty());
        byte[] saved = Files.readAllBytes(receipt);
        check(saved.length < 256);
        FileTime time = FileTime.fromMillis(100000);
        Files.setLastModifiedTime(receipt, time);
        // Lost Configure reply. A subsequent inspection settles it without a second Configure.
        check(dispatch(h, "inspect-update", TOKEN).equals("APPLIED " + TOKEN + "\n"));
        check(dispatch(h, "configure", TOKEN).isEmpty());
        check(Files.getLastModifiedTime(receipt).equals(time));
        check(Arrays.equals(saved, Files.readAllBytes(receipt)));
        refused(() -> dispatch(h, "inspect-update", NEXT));  // wrong token for the same staged generation
        refused(() -> Txn.codeUpdate(h.dir, BOOT, TOKEN, NEXT_DIR, h, false));
        refused(() -> Txn.codeUpdate(h.dir, NEXT, TOKEN, NEXT_DIR, h, true));
        check(Txn.codeUpdate(h.dir, BOOT, NEXT, NEXT_DIR, h, false).equals("PREVIOUS"));
        h.values.get("hide_self").add("foreign.After");
        refused(() -> dispatch(h, "inspect-update", TOKEN));
        h.values.get("hide_self").remove("foreign.After");
        check(Arrays.equals(journal, Files.readAllBytes(txn)) && Arrays.equals(migration, Files.readAllBytes(txu)));
        check(proof.equals(Txn.inspectState(h.dir, BOOT, h)) && pair.equals(h.pair()) && attempts == h.attempts);

        Files.delete(txu);
        refused(() -> dispatch(h, "inspect-update", TOKEN));
        Files.write(txu, migration);

        // A valid receipt with a different journal digest cannot acknowledge this operation.
        byte[] stale = saved.clone();
        stale[stale.length - 1] = stale[stale.length - 1] == '0' ? (byte)'1' : (byte)'0';
        Files.write(receipt, stale);
        refused(() -> dispatch(h, "inspect-update", TOKEN));
        refused(() -> dispatch(h, "configure", TOKEN));
        check(Arrays.equals(stale, Files.readAllBytes(receipt)));

        Files.write(receipt, new byte[saved.length]);
        refused(() -> dispatch(h, "inspect-update", TOKEN));
        refused(() -> dispatch(h, "configure", TOKEN));
        Files.write(receipt, saved);
        // Change the journal and live state together: still ACTIVE, but stale for this receipt.
        h.enable(BOOT, Arrays.asList("new.A","new.B"));
        check(Txn.inspectState(h.dir, BOOT, h).startsWith("ACTIVE "));
        refused(() -> dispatch(h, "inspect-update", TOKEN));
        refused(() -> dispatch(h, "configure", TOKEN));
        check(Arrays.equals(saved, Files.readAllBytes(receipt)));
        h.queueOn = h.attempts + 1;
        refused(() -> h.enable(BOOT, NAMES));
        int pendingAttempts = h.attempts;
        byte[] pending = Files.readAllBytes(txn);
        refused(() -> Txn.codeUpdate(h.dir, BOOT, NEXT, NEXT_DIR, h, false));
        refused(() -> Txn.codeUpdate(h.dir, BOOT, NEXT, NEXT_DIR, h, true));
        check(pendingAttempts == h.attempts && Arrays.equals(pending, Files.readAllBytes(txn)));
        check(Arrays.equals(saved, Files.readAllBytes(receipt)) && Arrays.equals(migration, Files.readAllBytes(txu)));
        TxnTest.Host clean = new TxnTest.Host(root, "code-handoff-no-migration");
        clean.enable(BOOT, NAMES);
        check(dispatch(clean, "inspect-update", TOKEN).equals("PREVIOUS " + TOKEN + "\n"));
        check(dispatch(clean, "configure", TOKEN).isEmpty());
        check(Txn.codeUpdate(clean.dir, BOOT, NEXT, NEXT_DIR, clean, true).equals("APPLIED"));
        check(Txn.codeUpdate(clean.dir, BOOT, NEXT, NEXT_DIR, clean, false).equals("APPLIED"));
        clean.disable(BOOT);
        refused(() -> Txn.codeUpdate(clean.dir, BOOT, NEXT, NEXT_DIR, clean, false));

        System.out.println("ACTIVE code handoff: PREVIOUS -> receipt only -> APPLIED; no inventory, setters or controller journal changes");
    }
}
