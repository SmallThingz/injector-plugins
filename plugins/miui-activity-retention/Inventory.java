import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

/** Declared activity components for one Android user from PackageManager metadata. */
public final class Inventory {
    private static final int MAX_SCANS = 3;
    static final long FLAGS = PackageManager.GET_ACTIVITIES
            | PackageManager.MATCH_DISABLED_COMPONENTS
            | PackageManager.MATCH_DISABLED_UNTIL_USED_COMPONENTS
            | PackageManager.MATCH_DIRECT_BOOT_AWARE
            | PackageManager.MATCH_DIRECT_BOOT_UNAWARE;

    interface PackageSource {
        void read(int user, long flags, Collector collector) throws Exception;
    }

    interface Verifier {
        void verify(int user, Set<String> packages) throws Exception;
    }

    private static final class PackageSetMismatch extends IOException {
        PackageSetMismatch(int metadataCount, int streamedCount) {
            super("Installed package sets differ: " + metadataCount + " metadata and "
                    + streamedCount + " streamed names");
        }
    }

    private Inventory() {}

    public static int currentUser() throws Exception {
        Class<?> manager = Class.forName("android.app.ActivityManager");
        Object service = manager.getMethod("getService").invoke(null);
        int user = (Integer) Class.forName("android.app.IActivityManager")
                .getMethod("getCurrentUserId").invoke(service);
        requireUser(user);
        return user;
    }

    public static List<String> classes(int user) throws Exception {
        return classes(user, Inventory::readInstalledPackages, Inventory::verifyInstalledNames);
    }

    static List<String> classes(int user, PackageSource source, Verifier verifier) throws Exception {
        requireUser(user);
        for (int attempt = 1; ; attempt++) {
            Collector collector = new Collector();
            source.read(user, FLAGS, collector);
            try {
                verifier.verify(user, collector.packages);
                return new ArrayList<>(collector.names);
            } catch (PackageSetMismatch changed) {
                if (attempt >= MAX_SCANS) throw changed;
                System.err.println("MIUI inventory package sets differ; rescanning (" + (attempt + 1)
                        + "/" + MAX_SCANS + ")");
            }
        }
    }

    private static void requireUser(int user) throws IOException {
        if (user < 0) throw new IOException("Expected a concrete Android user ID");
    }

    private static void readInstalledPackages(int user, long flags, Collector collector)
            throws Exception {
        Class<?> thread = Class.forName("android.app.ActivityThread");
        Object manager = thread.getMethod("getPackageManager").invoke(null);
        if (manager == null) throw new IOException("PackageManager unavailable");

        Class<?> api = Class.forName("android.content.pm.IPackageManager");
        Method getInstalled = api.getMethod("getInstalledPackages", long.class, int.class);
        Object slice = getInstalled.invoke(manager, flags, user);
        if (slice == null) throw new IOException("Missing installed-package reply");
        Object result = Class.forName("android.content.pm.ParceledListSlice")
                .getMethod("getList").invoke(slice);
        if (!(result instanceof List<?>)) throw new IOException("Unexpected installed-package reply");

        for (Object value : (List<?>) result) {
            if (!(value instanceof PackageInfo)) throw new IOException("Invalid package metadata");
            PackageInfo pkg = (PackageInfo) value;
            collector.addPackage(pkg.packageName);
            if (pkg.activities == null) continue;
            for (ActivityInfo activity : pkg.activities) {
                if (activity == null) throw new IOException("Invalid activity metadata");
                collector.addActivity(pkg.packageName, activity.packageName, activity.name, activity.targetActivity);
            }
        }
    }

    private static void verifyInstalledNames(int user, Set<String> metadata) throws Exception {
        // The package shell command lists names inside system_server and streams its output.
        // This independently verifies the potentially sliced IPackageManager reply.
        Process child = installedNamesCommand(user).start();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                child.getInputStream(), StandardCharsets.UTF_8))) {
            Set<String> observed = readNames(reader);
            if (child.waitFor() != 0) throw new IOException("Installed package name lookup failed");
            verifyNames(observed, metadata);
        } finally {
            child.destroy();
        }
    }

    static ProcessBuilder installedNamesCommand(int user) {
        return new ProcessBuilder("/system/bin/cmd", "package", "list", "packages",
                "--user", Integer.toString(user)).redirectErrorStream(true);
    }

    static Set<String> readNames(BufferedReader reader) throws IOException {
        Set<String> observed = new HashSet<>();
        String line;
        while ((line = packageLine(reader)) != null) {
            if (!line.startsWith("package:")) throw new IOException("Invalid installed package record");
            String name = line.substring("package:".length());
            if (!validQualifiedName(name) || !observed.add(name))
                throw new IOException("Invalid or repeated installed package name");
        }
        return observed;
    }

    static void verifyNames(Set<String> observed, Set<String> metadata) throws IOException {
        if (!observed.equals(metadata)) throw new PackageSetMismatch(metadata.size(), observed.size());
    }

    private static String packageLine(BufferedReader reader) throws IOException {
        StringBuilder line = new StringBuilder();
        for (int ch; (ch = reader.read()) != -1;) {
            if (ch == '\n') return line.toString();
            if (line.length() == 1024) throw new IOException("Invalid installed package name record");
            line.append((char) ch);
        }
        if (line.length() != 0) throw new IOException("Incomplete installed package name record");
        return null;
    }

    static final class Collector {
        final Set<String> packages = new HashSet<>();
        final TreeSet<String> names = new TreeSet<>();
        long bytes = Integer.BYTES;

        void addPackage(String name) throws IOException {
            if (!validQualifiedName(name) || !packages.add(name)) {
                throw new IOException("Invalid or repeated installed package metadata");
            }
        }

        void addActivity(String owner, String activityPackage, String name, String target)
                throws IOException {
            if (!packages.contains(owner) || !owner.equals(activityPackage)) {
                throw new IOException("Activity metadata package mismatch");
            }
            addName(className(owner, name));
            if (target != null) addName(className(owner, target));
        }

        private void addName(String name) throws IOException {
            if (names.add(name)) {
                bytes += ParcelCapacity.stringBytes(name);
                if (bytes > ParcelCapacity.NOMINAL_BINDER_BYTES) {
                    throw new IOException("Activity inventory exceeds list Parcel budget");
                }
            }
        }
    }

    static String className(String pkg, String name) throws IOException {
        if (!validQualifiedName(pkg) || name == null || name.isEmpty()) {
            throw new IOException("Invalid activity component metadata");
        }
        String qualified = name.startsWith(".") ? pkg + name
                : name.indexOf('.') < 0 ? pkg + "." + name : name;
        if (!validQualifiedName(qualified)) throw new IOException("Invalid activity class metadata");
        return qualified;
    }

    private static boolean validQualifiedName(String name) {
        if (name == null || name.isEmpty()) return false;
        boolean start = true;
        for (int i = 0; i < name.length();) {
            int cp = name.codePointAt(i);
            if (!start && cp == '.') {
                start = true;
            } else {
                if (start ? !Character.isJavaIdentifierStart(cp)
                        : !Character.isJavaIdentifierPart(cp) || Character.isIdentifierIgnorable(cp)) {
                    return false;
                }
                start = false;
            }
            i += Character.charCount(cp);
        }
        return !start;
    }
}
