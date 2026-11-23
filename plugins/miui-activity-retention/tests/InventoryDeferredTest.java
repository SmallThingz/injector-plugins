import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;

public final class InventoryDeferredTest {
    private static final String BOOT = "d2059cec-afdf-487f-a414-20e7cc6a9662";
    private static final String CHALLENGE = "bac60c04-a7e7-42d1-88ce-1ab85aeeb704";
    private static final String GENERATION = "20942a93-f729-48eb-9f56-894c0d8da205";
    private static final String DIRECTORY = "/review/" + GENERATION;
    private static final List<String> ORIGINAL = Collections.singletonList("app.Original");

    private static Txn.InventorySource unstable(int[] scans) {
        return () -> Inventory.classes(10, (user, flags, data) -> {
            scans[0]++;
            data.addPackage("fixture.pkg");
        }, (user, metadata) -> Inventory.verifyNames(Collections.emptySet(), metadata));
    }

    private static void run(TxnTest.Host h, String event, String challenge, String directory, String boot,
                            Txn.InventorySource scan, Callable<Integer> currentUser) throws Exception {
        Txn.runWithInventory(h.dir, boot, "enable", () -> InventoryDeferred.read(scan, event,
                challenge, directory, h.dir, boot, h, 10, currentUser), h);
    }

    private interface Attempt { void run() throws Exception; }

    private static void ordinaryFailure(Attempt attempt) throws Exception {
        try {
            attempt.run();
            throw new AssertionError("Expected a failure");
        } catch (InventoryDeferred unexpected) {
            throw new AssertionError("Unsafe deferred result", unexpected);
        } catch (IOException | IllegalArgumentException expected) {}
    }

    public static void main(String[] args) throws Exception {
        Path root = Paths.get(args[0]);
        TxnTest.Host h = new TxnTest.Host(root, "inventory-deferred");
        h.enable(BOOT, ORIGINAL);
        Path journal = h.dir.resolve("txn.journal");
        Path cursor = h.dir.resolve("activity-package-sequence");
        byte[] oldCursor = {1, 2, 3};
        Files.write(cursor, oldCursor);
        byte[] original = Files.readAllBytes(journal);
        String hash = Txn.inspectState(h.dir, BOOT, h).substring("ACTIVE ".length());
        int before = h.attempts;
        int[] scans = {0};
        try {
            run(h, "interval", CHALLENGE, DIRECTORY, BOOT, unstable(scans), () -> 10);
            throw new AssertionError("Missing typed result");
        } catch (InventoryDeferred deferred) {
            check(InventoryDeferred.EXIT_CODE == 75);
            check(deferred.getMessage().equals("MIUI_INVENTORY_DEFERRED " + CHALLENGE + " "
                    + GENERATION + " " + BOOT + " " + hash));
            check(scans[0] == 3);
        }
        for (String event : Arrays.asList("run", "enable", "configure", "boot", "inspect-inventory"))
            ordinaryFailure(() -> run(h, event, CHALLENGE, DIRECTORY, BOOT, unstable(scans), () -> 10));
        ordinaryFailure(() -> run(h, "interval", null, DIRECTORY, BOOT, unstable(scans), () -> 10));
        ordinaryFailure(() -> run(h, "interval", "wrong", DIRECTORY, BOOT, unstable(scans), () -> 10));
        ordinaryFailure(() -> run(h, "interval", CHALLENGE, "relative", BOOT, unstable(scans), () -> 10));
        ordinaryFailure(() -> run(h, "interval", CHALLENGE, DIRECTORY, CHALLENGE, unstable(scans), () -> 10));
        int[] userChecks = {0};
        ordinaryFailure(() -> run(h, "interval", CHALLENGE, DIRECTORY, BOOT, unstable(scans),
                () -> ++userChecks[0] == 1 ? 10 : 11));
        ordinaryFailure(() -> run(h, "interval", CHALLENGE, DIRECTORY, BOOT,
                () -> { throw new IOException("malformed metadata"); }, () -> 10));
        check(Arrays.equals(original, Files.readAllBytes(journal)));
        check(Arrays.equals(oldCursor, Files.readAllBytes(cursor)) && before == h.attempts);
        h.values.get("show_hidden").add("external.Change");
        ordinaryFailure(() -> run(h, "interval", CHALLENGE, DIRECTORY, BOOT, unstable(scans), () -> 10));
        h.values.get("show_hidden").remove("external.Change");

        // A stable inventory is allowed into the real writer. Lost dispatch stays ambiguous.
        h.queueOn = before + 1;
        ordinaryFailure(() -> run(h, "interval", CHALLENGE, DIRECTORY, BOOT,
                () -> Arrays.asList("app.Original", "app.Added"), () -> 10));
        byte[] pending = Files.readAllBytes(journal);
        check(!Arrays.equals(original, pending) && h.attempts == before + 1);
        ordinaryFailure(() -> run(h, "interval", CHALLENGE, DIRECTORY, BOOT, unstable(scans), () -> 10));
        check(Arrays.equals(pending, Files.readAllBytes(journal)) && h.attempts == before + 1);
        check(Arrays.equals(oldCursor, Files.readAllBytes(cursor)));
        System.out.println("Three exhausted inventory scans yield one bound deferral only with settled ACTIVE state");
    }

    private static void check(boolean result) {
        if (!result) throw new AssertionError();
    }
}
