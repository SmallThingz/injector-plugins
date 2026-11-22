import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.lang.reflect.Method;
import java.util.*;

public final class ActivityLists implements Txn.IO {
    private final Object service;
    private final Class<?> api;
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
    public void set(String field, List<String> value) throws Exception {
        Method setter = api.getMethod("set" + suffix(field), List.class);
        setter.invoke(service, value);
    }
    static String resolve(String component) throws Exception {
        Process child = new ProcessBuilder("/system/bin/cmd","package","resolve-activity",
                "--brief","--user","0","-n",component).redirectErrorStream(true).start();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(child.getInputStream(), StandardCharsets.UTF_8))) {
            String last = null;
            for (String line; (line = r.readLine()) != null;) if (!line.trim().isEmpty()) last = line.trim();
            if (child.waitFor() != 0 || last == null) throw new IOException("Activity resolution failed");
            return last;
        } finally {child.destroy();}
    }
    public static void main(String[] args) throws Exception {
        if (args.length != 3 || android.os.Process.myUid() != 0 ||
            !android.os.Build.FINGERPRINT.equals("Redmi/amethyst_in/amethyst:16/BP2A.250605.031.A3/OS3.0.303.0.WOPINXM:user/release-keys"))
            throw new IllegalStateException("Unsupported caller or firmware");
        String boot = new String(Files.readAllBytes(Paths.get("/proc/sys/kernel/random/boot_id")),StandardCharsets.US_ASCII).trim();
        if (!UUID.fromString(boot).toString().equals(boot)) throw new IOException("Boot identity missing");
        ActivityLists io = new ActivityLists();
        if (args[0].equals("check-active")) {
            Txn.checkActive(Paths.get(args[1]), boot, io);
            System.out.println("Journal and both active lists matched");
            return;
        }
        if (args[0].equals("inspect")) {
            List<String> names = Components.classes(args[2], ActivityLists::resolve);
            System.out.println("Resolved class count " + names.size() + ", baseline list lengths "
                    + io.read("hide_self").size() + " and " + io.read("show_hidden").size());
            return;
        }
        List<String> selected = args[0].equals("disable") ? Collections.emptyList() : Components.classes(args[2],ActivityLists::resolve);
        Txn.run(Paths.get(args[1]),boot,args[0],selected,io);
        System.out.println(args[0].equals("disable") ? "Compatibility configuration inactive" : "Selected activity lists verified");
    }
}
