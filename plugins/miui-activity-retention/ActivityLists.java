import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

public final class ActivityLists implements Txn.IO {
    private static final String FIRMWARE =
            "Redmi/amethyst_in/amethyst:16/BP2A.250605.031.A3/OS3.0.303.0.WOPINXM:user/release-keys";
    private static final long STARTED = System.nanoTime();

    private static void stage(String message) {
        long elapsedMs = (System.nanoTime() - STARTED) / 1_000_000;
        System.err.println("MIUI stage: " + message + " elapsed_ms=" + elapsedMs);
    }

    private final boolean recoverTarget;
    private final Object service;
    private final Class<?> api;
    private int inventoryUser = -1;

    private ActivityLists(boolean recoverTarget) throws Exception {
        this.recoverTarget = recoverTarget;
        service = Class.forName("android.app.ActivityManager").getMethod("getService").invoke(null);
        api = Class.forName("android.app.IActivityManager");
    }

    private String suffix(String field) {
        switch (field) {
            case "hide_self": return "HideSelfIfNewFreeformTaskWhiteList";
            case "show_hidden": return "ShowHiddenTaskIfFinishedWhiteList";
            default: throw new IllegalArgumentException("Unknown list");
        }
    }

    public List<String> read(String field) throws Exception {
        Object result = api.getMethod("get" + suffix(field)).invoke(service);
        if (!(result instanceof List)) throw new IOException("Unexpected getter reply");
        List<String> copy = new ArrayList<>();
        for (Object item : (List<?>)result) copy.add((String)item);
        return copy;
    }

    private void checkUser() throws Exception {
        if (inventoryUser >= 0 && inventoryUser != Inventory.currentUser())
            throw new IOException("Current Android user changed during inventory");
    }

    public void preflight(String field, List<String> value) throws Exception {
        ParcelCapacity.check(value);
    }

    public void set(String field, List<String> value) throws Exception {
        Method setter;
        try {
            checkUser();
            setter = api.getMethod("set" + suffix(field), List.class);
        } catch (Exception beforeDispatch) {
            throw new Txn.WriteRejectedException("Setter was not dispatched", beforeDispatch);
        }
        stage("dispatch " + field + " entries=" + value.size());
        setter.invoke(service, value);
    }

    private void inspectInventory(List<String> names) throws Exception {
        System.out.println("Declared activity classes: " + names.size());
        for (String field : new String[]{"hide_self", "show_hidden"}) {
            List<String> original = read(field);
            List<String> target = new ArrayList<>(original);
            LinkedHashSet<String> seen = new LinkedHashSet<>(original);
            for (String name : names) if (seen.add(name)) target.add(name);
            ParcelCapacity.Size size = ParcelCapacity.check(target);
            System.out.println(field + " additive image: " + target.size() + " entries, " + size);
        }
    }

    interface InventoryEvent {
        void run(String event, Path state, String updateId, String boot) throws Exception;
    }

    static void execute(String event, Path state, String updateId, String boot,
                        Txn.IO controller, InventoryEvent inventory) throws Exception {
        if (event.equals("inspect-state") || event.equals("inspect-recovery")) {
            String challenge = System.getenv("INJECTOR_INSPECT_ID");
            if (challenge == null || !UUID.fromString(challenge).toString().equals(challenge))
                throw new IllegalArgumentException("Invalid inspection challenge");
            boolean recovery = event.equals("inspect-recovery");
            long started = System.nanoTime();
            String proof = recovery ? Txn.inspectRecovery(state, boot, controller) : Txn.inspectState(state, boot, controller);
            long elapsedMs = (System.nanoTime() - started) / 1_000_000;
            System.out.println((recovery ? "MIUI_RECOVERY_OBSERVED " : "MIUI_STATE ")
                    + challenge + " " + boot + " " + proof + " " + elapsedMs);
            return;
        }
        if (event.equals("inspect-update")) {
            if ("1".equals(System.getenv("INJECTOR_RECOVERY_HANDOFF"))) {
                if (!UUID.fromString(updateId).toString().equals(updateId))
                    throw new IllegalArgumentException("Invalid recovery handoff ID");
                Txn.requireRepairable(state, boot, controller);
                System.out.println("REPAIRABLE " + updateId);
                return;
            }
            System.out.println(Txn.inspectUpdate(state, boot, updateId, controller) + " " + updateId);
            return;
        }
        if (event.equals("disable")) {
            stage("restore started");
            Txn.run(state, boot, "disable", Collections.emptyList(), controller);
            Files.deleteIfExists(state.resolve("activity-package-sequence"));
            stage("restore verified");
            return;
        }
        boolean refresh = event.equals("interval") || event.equals("boot") || event.equals("run");
        if (refresh) Txn.requireEnabled(state);
        if (!refresh && !event.equals("enable") && !event.equals("configure") && !event.equals("inspect-inventory"))
            throw new IllegalArgumentException("Unknown event");

        inventory.run(event, state, updateId, boot);
    }

    private void applyInventory(String event, Path state, String updateId, String boot) throws Exception {
        inventoryUser = Inventory.currentUser();
        PackageChanges changes = new PackageChanges(state, boot, inventoryUser);
        boolean interval = event.equals("interval");
        if (interval && !changes.observe()) {
            try {
                Txn.checkActive(state, boot, this);
                checkUser();
                return;
            } catch (IOException drift) {
                // The normal refresh reconciles owned values and rejects uncertain state.
            }
        }
        boolean inspecting = event.equals("inspect-inventory");
        Txn.InventorySource inventory = () -> {
            if (!inspecting) stage("inventory started");
            if (!interval) changes.observe();
            List<String> names = Inventory.classes(inventoryUser);
            if (names.isEmpty()) throw new IOException("Empty current-user activity inventory");
            checkUser();
            if (!inspecting) stage("inventory complete entries=" + names.size());
            return names;
        };
        if (inspecting) {
            inspectInventory(inventory.classes());
            return;
        }
        int count;
        if (event.equals("configure")) {
            List<String> names = inventory.classes();
            Txn.configure(state, boot, updateId, names, this);
            count = names.size();
        } else if (recoverTarget) {
            count = Txn.enableFromRestoreTarget(state, boot, inventory, this);
        } else {
            count = Txn.runWithInventory(state, boot, "enable", inventory, this);
        }
        checkUser();
        changes.record();
        System.out.println("Verified both lists for " + count + " declared activity classes");
    }

    static boolean explicitTargetEnable(String event, String request, String generation, String pluginDir) {
        if (request == null && generation == null) return false;
        if (!"enable".equals(event) || request == null || generation == null || pluginDir == null
                || !UUID.fromString(request).toString().equals(request)
                || !UUID.fromString(generation).toString().equals(generation)
                || !Paths.get(pluginDir).isAbsolute()
                || !Paths.get(generation).equals(Paths.get(pluginDir).getFileName()))
            throw new IllegalArgumentException("Invalid explicit Enable identity");
        return true;
    }

    public static void main(String[] args) {
        try {
            run(args);
        } catch (Exception failure) {
            reportFailure(failure);
            System.exit(1);
        }
    }

    static void reportFailure(Exception failure) {
        // Binder and framework exception messages can include their arguments.
        Throwable cause = failure;
        for (int depth = 0; cause != null && depth < 4; depth++, cause = cause.getCause()) {
            StackTraceElement[] frames = cause.getStackTrace();
            boolean txnError = frames.length > 0 && frames[0].getClassName().equals(Txn.class.getName())
                    && cause.getClass() == IOException.class;
            System.err.println("MIUI worker " + (depth == 0 ? "failure " : "cause ") + cause.getClass().getName()
                    + (txnError ? ": " + cause.getMessage() : ""));
            for (int i = 0; i < Math.min(4, frames.length); i++)
                System.err.println("  at " + frames[i]);
        }
    }

    private static void run(String[] args) throws Exception {
        if (args.length != 3 || android.os.Process.myUid() != 0 || !android.os.Build.FINGERPRINT.equals(FIRMWARE))
            throw new IllegalStateException("Unsupported caller or firmware");
        String boot = new String(Files.readAllBytes(Paths.get("/proc/sys/kernel/random/boot_id")),
                StandardCharsets.US_ASCII).trim();
        if (!UUID.fromString(boot).toString().equals(boot)) throw new IOException("Boot identity missing");
        if (!args[0].startsWith("inspect-")) {
            stage("worker " + args[0] + " pid=" + android.os.Process.myPid()
                    + " boot_ms=" + android.os.SystemClock.elapsedRealtime());
        }
        boolean recoverTarget = explicitTargetEnable(args[0], System.getenv("INJECTOR_EXPLICIT_ENABLE_ID"),
                System.getenv("INJECTOR_EXPLICIT_ENABLE_GENERATION"), System.getenv("INJECTOR_PLUGIN_DIR"));
        ActivityLists bridge = new ActivityLists(recoverTarget);
        execute(args[0], Paths.get(args[1]), args[2], boot, bridge, bridge::applyInventory);
    }
}
