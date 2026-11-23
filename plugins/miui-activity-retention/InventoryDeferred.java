import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;

/** Job result issued inside the inventory callback, before the transaction can prepare a write. */
final class InventoryDeferred extends Exception {
    static final int EXIT_CODE = 75;
    private static final long serialVersionUID = 1L;

    private InventoryDeferred(String message) {
        super(message);
    }

    static List<String> read(Txn.InventorySource source, String event, String challenge, String pluginDir,
                             Path state, String boot, Txn.IO controller, int user, Callable<Integer> currentUser)
            throws Exception {
        try {
            return source.classes();
        } catch (Inventory.PackageSetMismatch exhausted) {
            if (!"interval".equals(event) || challenge == null) throw exhausted;
        }
        if (pluginDir == null) throw new IOException("Missing refresh installation");
        Path directory = Paths.get(pluginDir);
        if (!directory.isAbsolute() || directory.getFileName() == null)
            throw new IOException("Invalid refresh installation");
        String generation = directory.getFileName().toString();
        requireUuid(generation);
        requireUuid(challenge);
        requireUuid(boot);
        if (user < 0 || currentUser.call() != user) throw new IOException("Inventory user changed");
        String proof = Txn.inspectState(state, boot, controller);
        if (!proof.startsWith("ACTIVE ")) throw new IOException("Expected active inventory controller");
        if (currentUser.call() != user) throw new IOException("Inventory user changed");
        throw new InventoryDeferred("MIUI_INVENTORY_DEFERRED " + challenge + " " + generation
                + " " + boot + " " + proof.substring("ACTIVE ".length()));
    }

    private static void requireUuid(String value) throws IOException {
        if (!UUID.fromString(value).toString().equals(value)) throw new IOException("Invalid refresh identity");
    }
}
