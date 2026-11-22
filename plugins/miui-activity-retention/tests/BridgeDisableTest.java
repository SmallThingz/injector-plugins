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

    public static void main(String[] args) throws Exception {
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
