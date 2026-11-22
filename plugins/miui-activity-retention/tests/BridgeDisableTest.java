import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collections;

public final class BridgeDisableTest {
    // Each approved Restore reaches the ordinary Disable event. Its UI key stays in the host.
    private static void disable(TxnTest.Host host) throws Exception {
        ActivityLists.execute("disable", host.dir, "", "boot", host, (event, state, update, boot) -> {
            throw new AssertionError("Disable entered package inventory");
        });
    }

    private static void enableIdentity() {
        String request = "130fb554-a777-4fb2-bfa1-214d8a8d5f4f";
        String generation = "48b84f00-5231-4198-bb73-4aa08a7c9311";
        String dir = "/review/" + generation;
        check(!ActivityLists.explicitTargetEnable("enable", null, null, dir));
        check(ActivityLists.explicitTargetEnable("enable", request, generation, dir));
        for (String event : Arrays.asList("interval", "boot", "run", "configure", "disable", "inspect-recovery"))
            rejectIdentity(event, request, generation, dir);
        rejectIdentity("enable", null, generation, dir);
        rejectIdentity("enable", request, null, dir);
        rejectIdentity("enable", request, generation, "/review/" + request);
        rejectIdentity("enable", request, generation, generation);
        rejectIdentity("enable", request, generation, "/");
        rejectIdentity("enable", request.toUpperCase(java.util.Locale.ROOT), generation, dir);
        rejectIdentity("enable", request, "invalid", dir);
    }

    private static void rejectIdentity(String event, String request, String generation, String dir) {
        try {
            ActivityLists.explicitTargetEnable(event, request, generation, dir);
            throw new AssertionError("Invalid explicit Enable identity accepted");
        } catch (IllegalArgumentException expected) {}
    }

    public static void main(String[] args) throws Exception {
        enableIdentity();
        TxnTest.Host host = new TxnTest.Host(Paths.get(args[0]), "explicit-restore");
        host.enable("boot", Collections.singletonList("app.Activity"));
        Path cursor = Files.write(host.dir.resolve("activity-package-sequence"), new byte[]{1});
        int beforeDisable = host.attempts;
        host.queueOn = beforeDisable + 2; // SHOW restored; last HIDE queued with a lost reply.
        try {
            disable(host);
            throw new AssertionError("First Disable should be unconfirmed");
        } catch (IOException expected) {
            check("Queued one-way setter, reply lost".equals(expected.getMessage()));
        }
        check("hide_self".equals(host.queuedField));
        Path journal = host.dir.resolve("txn.journal");
        byte[] pending = Files.readAllBytes(journal);
        try {
            disable(host);
            throw new AssertionError("Fresh explicit Restore resent the pending Disable");
        } catch (IOException expected) {
            check(expected.getMessage().contains("Awaiting confirmed afterimage"));
        }
        check(host.attempts == beforeDisable + 2 && Arrays.equals(pending, Files.readAllBytes(journal)));
        check(Files.exists(cursor));
        host.values.put(host.queuedField, host.queuedValue); // Deliver the original once.
        disable(host);
        check(host.attempts == beforeDisable + 2 && !Files.exists(cursor));
        check(Txn.inspectState(host.dir, "boot", host).startsWith("INACTIVE "));
        System.out.println("Explicit Disable/Restore: 2 initial setters, 0 resends, 0 afterimage setters");
    }

    private static void check(boolean value) {
        if (!value) throw new AssertionError();
    }
}
