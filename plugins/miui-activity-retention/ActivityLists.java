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
    private final Object service;
    private final Class<?> api;
    private int inventoryUser = -1;

    private ActivityLists() throws Exception {
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

    private void execute(String event, Path state, String updateId, String boot) throws Exception {
        if (event.equals("inspect-state") || event.equals("inspect-recovery")) {
            String challenge = System.getenv("INJECTOR_INSPECT_ID");
            if (challenge == null || !UUID.fromString(challenge).toString().equals(challenge))
                throw new IllegalArgumentException("Invalid inspection challenge");
            boolean recovery = event.equals("inspect-recovery");
            long started = System.nanoTime();
            String proof = recovery ? Txn.inspectRecovery(state, boot, this) : Txn.inspectState(state, boot, this);
            long elapsedMs = (System.nanoTime() - started) / 1_000_000;
            System.out.println((recovery ? "MIUI_RECOVERY_OBSERVED " : "MIUI_STATE ")
                    + challenge + " " + boot + " " + proof + " " + elapsedMs);
            return;
        }
        if (event.equals("inspect-update")) {
            if ("1".equals(System.getenv("INJECTOR_RECOVERY_HANDOFF"))) {
                if (!UUID.fromString(updateId).toString().equals(updateId))
                    throw new IllegalArgumentException("Invalid recovery handoff ID");
                Txn.requireRepairable(state, boot, this);
                System.out.println("REPAIRABLE " + updateId);
                return;
            }
            System.out.println(Txn.inspectUpdate(state, boot, updateId, this) + " " + updateId);
            return;
        }
        if (event.equals("disable")) {
            System.err.println("MIUI stage: restore started");
            Txn.run(state, boot, "disable", Collections.emptyList(), this);
            Files.deleteIfExists(state.resolve("activity-package-sequence"));
            System.err.println("MIUI stage: restore verified");
            return;
        }
        boolean refresh = event.equals("interval") || event.equals("boot") || event.equals("run");
        if (refresh) Txn.requireEnabled(state);
        if (!refresh && !event.equals("enable") && !event.equals("configure") && !event.equals("inspect-inventory"))
            throw new IllegalArgumentException("Unknown event");

        inventoryUser = Inventory.currentUser();
        PackageChanges changes = new PackageChanges(state, boot, inventoryUser);
        boolean changed = changes.observe();
        if (event.equals("interval") && !changed) {
            try {
                Txn.checkActive(state, boot, this);
                checkUser();
                return;
            } catch (IOException drift) {
                // The normal refresh reconciles owned values and rejects uncertain state.
            }
        }
        boolean inspecting = event.equals("inspect-inventory");
        if (!inspecting) System.err.println("MIUI stage: inventory started");
        List<String> names = Inventory.classes(inventoryUser);
        if (names.isEmpty()) throw new IOException("Empty current-user activity inventory");
        checkUser();
        if (inspecting) {
            inspectInventory(names);
            return;
        }
        System.err.println("MIUI stage: applying verified inventory");
        if (event.equals("configure")) Txn.configure(state, boot, updateId, names, this);
        else Txn.run(state, boot, "enable", names, this);
        checkUser();
        changes.record();
        System.out.println("Verified both lists for " + names.size() + " declared activity classes");
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 3 || android.os.Process.myUid() != 0 || !android.os.Build.FINGERPRINT.equals(FIRMWARE))
            throw new IllegalStateException("Unsupported caller or firmware");
        String boot = new String(Files.readAllBytes(Paths.get("/proc/sys/kernel/random/boot_id")),
                StandardCharsets.US_ASCII).trim();
        if (!UUID.fromString(boot).toString().equals(boot)) throw new IOException("Boot identity missing");
        new ActivityLists().execute(args[0], Paths.get(args[1]), args[2], boot);
    }
}
