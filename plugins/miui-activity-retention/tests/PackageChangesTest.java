import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/** Exercise the persisted PackageManager cursor without a device or a fabricated inventory. */
public final class PackageChangesTest {
    public static void main(String[] args) throws Exception {
        Path dir = Files.createDirectories(Paths.get(args[0]));
        PackageChanges first = new PackageChanges(dir, "boot-one", 10);
        check(first.observe((since, user) -> { check(since == 0 && user == 10); return 41; }));
        // A failed refresh never records its cursor.
        check(first.observe((since, user) -> { check(since == 0); return 42; }));
        first.record();
        check(!first.observe((since, user) -> { check(since == 42); return null; }));
        check(first.observe((since, user) -> { check(since == 42); return 43; }));
        first.record();
        PackageChanges switched = new PackageChanges(dir, "boot-one", 11);
        check(switched.observe((since, user) -> { check(since == 0 && user == 11); return null; }));
        PackageChanges reboot = new PackageChanges(dir, "boot-two", 10);
        check(reboot.observe((since, user) -> { check(since == 0); return 1; }));
        reboot.record();
        check(!reboot.observe((since, user) -> { check(since == 1); return null; }));
        Files.write(dir.resolve("activity-package-sequence"), new byte[]{(byte) 0xff});
        check(reboot.observe((since, user) -> { check(since == 0); return 45; }));
        reboot.record();
        check(!reboot.observe((since, user) -> { check(since == 45); return null; }));
        // A failed cache rename after the controller commits must leave verification successful.
        Path cursor = dir.resolve("activity-package-sequence");
        Files.delete(cursor);
        Files.createDirectory(cursor);
        reboot.record();
        check(Files.isDirectory(cursor));
        try (java.util.stream.Stream<Path> files = Files.list(dir)) {
            check(files.count() == 1);
        }
        check(reboot.observe((since, user) -> { check(since == 0); return 46; }));
        System.out.println("Package change cursor, failed scan, user switch and reboot checks passed");
    }

    private static void check(boolean value) {
        if (!value) throw new AssertionError();
    }
}
