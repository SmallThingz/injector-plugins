import android.content.pm.ChangedPackages;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;

/** PackageManager's sequence is per boot. The cursor is a hint, never transaction evidence. */
final class PackageChanges {
    private final Path path;
    private final String boot;
    private final int user;
    private int sequence;

    PackageChanges(Path directory, String boot, int user) {
        this.path = directory.resolve("activity-package-sequence");
        this.boot = boot;
        this.user = user;
    }

    interface ReadSequence {
        Integer changedSince(int since, int user) throws Exception;
    }

    boolean observe() throws Exception {
        return observe(PackageChanges::changedSince);
    }

    private static Integer changedSince(int since, int user) throws Exception {
        Object pm = Class.forName("android.app.ActivityThread").getMethod("getPackageManager").invoke(null);
        ChangedPackages changes = (ChangedPackages)Class.forName("android.content.pm.IPackageManager")
                .getMethod("getChangedPackages", int.class, int.class).invoke(pm, since, user);
        return changes == null ? null : changes.getSequenceNumber();
    }

    boolean observe(ReadSequence reader) throws Exception {
        String prefix = boot + " " + user + " ";
        List<String> previous;
        try {
            previous = Files.readAllLines(path, StandardCharsets.US_ASCII);
        } catch (IOException unavailableCursor) {
            previous = java.util.Collections.emptyList();
        }
        boolean hasCursor = previous.size() == 1 && previous.get(0).startsWith(prefix);
        int since = 0;
        if (hasCursor) {
            try {
                since = Integer.parseInt(previous.get(0).substring(prefix.length()));
                hasCursor = since >= 0;
            } catch (NumberFormatException invalidCursor) {
                hasCursor = false;
            }
        }
        Integer changes = reader.changedSince(hasCursor ? since : 0, user);
        sequence = changes == null ? (hasCursor ? since : 0) : changes;
        if (sequence < 0) throw new IOException("Invalid PackageManager change sequence");
        return !hasCursor || changes != null;
    }

    void record() throws IOException {
        Path tmp = Files.createTempFile(path.getParent(), ".activity-package-sequence-", ".tmp");
        try {
            Files.write(tmp, (boot + " " + user + " " + sequence + "\n").getBytes(StandardCharsets.US_ASCII));
            Files.move(tmp, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(tmp);
        }
    }
}
