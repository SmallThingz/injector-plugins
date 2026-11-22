import android.content.pm.PackageManager;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class InventoryTest {
    public static void main(String[] args) throws Exception {
        check(Inventory.className("example.one", ".Home").equals("example.one.Home"));
        check(Inventory.className("example.one", "Home").equals("example.one.Home"));
        check(Inventory.className("example.one", "library.base.Home$Inner")
                .equals("library.base.Home$Inner"));
        check(Inventory.className("android", "Framework").equals("android.Framework"));
        check(Inventory.className("example.one", ".\u03A9").equals("example.one.\u03A9"));
        for (String invalid : Arrays.asList(null, "", ".", "one..Two", "one.Two.",
                "one/Two", "one.Two\n", "one.Two\u200B", "one.2Two", "one.*")) {
            reject(() -> Inventory.className("example.one", invalid));
        }

        check(Inventory.installedNamesCommand(17).command().equals(Arrays.asList(
                "/system/bin/cmd", "package", "list", "packages", "--user", "17")));
        int[] calls = new int[2];
        List<String> actual = Inventory.classes(17, (user, flags, inventory) -> {
            calls[0]++;
            check(user == 17);
            check(has(flags, PackageManager.GET_ACTIVITIES));
            check(has(flags, PackageManager.MATCH_DISABLED_COMPONENTS));
            check(has(flags, PackageManager.MATCH_DISABLED_UNTIL_USED_COMPONENTS));
            check(has(flags, PackageManager.MATCH_DIRECT_BOOT_AWARE));
            check(has(flags, PackageManager.MATCH_DIRECT_BOOT_UNAWARE));
            check(!has(flags, PackageManager.MATCH_UNINSTALLED_PACKAGES));

            inventory.addPackage("example.one");
            inventory.addPackage("example.two");
            inventory.addPackage("example.withoutactivities");
            // Includes a disabled declaration, an alias, and a private non-launcher activity.
            // PackageInfo has no launcher filter and none of these require an individual lookup.
            inventory.addActivity("example.one", "example.one", ".PrivateDisabled", null);
            inventory.addActivity("example.one", "example.one", "HomeAlias", ".Real");
            inventory.addActivity("example.one", "example.one", ".Real", null);
            inventory.addActivity("example.one", "example.one", ".Internal", null);
            inventory.addActivity("example.two", "example.two", "example.one.Real", null);
            inventory.addActivity("example.two", "example.two", ".OtherAlias", "library.Target");
        }, (user, packages) -> {
            calls[1]++;
            check(user == 17 && packages.size() == 3);
            Inventory.verifyNames(reader("package:example.withoutactivities\npackage:example.two\n"
                    + "package:example.one\n"), packages);
        });
        check(calls[0] == 1 && calls[1] == 1);
        check(actual.equals(Arrays.asList("example.one.HomeAlias", "example.one.Internal",
                "example.one.PrivateDisabled", "example.one.Real", "example.two.OtherAlias",
                "library.Target")));

        reject(() -> Inventory.classes(-2, (u, f, c) -> fail(), (u, p) -> fail()));
        reject(() -> Inventory.classes(17, (u, f, c) -> c.addPackage("example.one"),
                (u, p) -> Inventory.verifyNames(reader("package:example.one\npackage:example.two\n"), p)));
        reject(() -> Inventory.verifyNames(reader("package:example.one\n"),
                packages("example.one", "example.two")));
        reject(() -> Inventory.verifyNames(reader("package:example.one"), packages("example.one")));
        reject(() -> Inventory.verifyNames(reader("package:example.one\npackage:example.one\n"),
                packages("example.one", "example.two")));
        reject(() -> Inventory.verifyNames(reader("Unexpected shell warning\n"), packages("example.one")));
        reject(() -> Inventory.verifyNames(reader(new String(new char[1025])), packages("example.one")));

        Inventory.Collector inventory = new Inventory.Collector();
        inventory.addPackage("example.one");
        reject(() -> inventory.addActivity("example.one", "example.two", "Alias", ".Target"));
        reject(() -> inventory.addActivity("example.one", "example.one", "Alias", ""));
        reject(() -> inventory.addPackage("example.one"));
        String largeSuffix = new String(new char[4096]).replace('\0', 'a');
        reject(() -> {
            for (int i = 0; i < 200; i++) {
                inventory.addActivity("example.one", "example.one", "." + largeSuffix + i, null);
            }
        });
        System.out.println("Inventory component, user, deduplication, completeness and bounds checks passed");
    }

    private static boolean has(long flags, int bit) {
        return (flags & bit) != 0;
    }

    private static Set<String> packages(String... packages) {
        return new HashSet<>(Arrays.asList(packages));
    }

    private static BufferedReader reader(String text) {
        return new BufferedReader(new StringReader(text));
    }

    private static void check(boolean condition) {
        if (!condition) fail();
    }

    private static void fail() {
        throw new AssertionError();
    }

    private static void reject(Body body) throws Exception {
        try {
            body.run();
            fail();
        } catch (IOException expected) {}
    }

    interface Body {
        void run() throws Exception;
    }
}
