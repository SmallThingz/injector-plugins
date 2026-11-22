import java.io.*;
import java.nio.channels.FileChannel;
import java.nio.file.*;
import java.util.*;

/** Callers serialize the entire invocation when sharing a journal. */
public final class Txn {
    public interface IO {
        List<String> read(String field) throws Exception;
        void set(String field, List<String> value) throws Exception;
    }

    private static final String[] FIELDS = {"hide_self", "show_hidden"};
    private final String boot;
    private final List<String> selected;
    private final List<List<String>> original;
    private int applied;
    private boolean complete;
    // Signed one-based field index: positive for apply, negative for restore.
    private int pending;

    private Txn(String boot, List<String> selected, List<List<String>> original) {
        this.boot = boot;
        this.selected = selected;
        this.original = original;
    }

    private static List<List<String>> snapshot(IO io) throws Exception {
        List<List<String>> result = new ArrayList<>();
        for (String field : FIELDS) result.add(new ArrayList<>(io.read(field)));
        return result;
    }

    private List<String> target(int i) {
        List<String> list = new ArrayList<>(original.get(i));
        for (String name : selected) if (!list.contains(name)) list.add(name);
        return list;
    }

    private List<List<String>> expected(int mask) {
        List<List<String>> pair = new ArrayList<>(original);
        for (int i = 0; i < FIELDS.length; i++) {
            if ((mask & (1 << i)) != 0) pair.set(i, target(i));
        }
        return pair;
    }

    private void verify(IO io) throws Exception {
        if (!snapshot(io).equals(expected(applied))) throw new IOException("Lists changed externally");
    }

    private void change(Path path, IO io, int i, boolean enable) throws Exception {
        int next = enable ? applied | (1 << i) : applied & ~(1 << i);
        List<List<String>> before = expected(applied);
        List<List<String>> after = expected(next);
        if (after.equals(before)) return;
        verify(io);
        pending = (enable ? 1 : -1) * (i + 1);
        save(path);
        io.set(FIELDS[i], new ArrayList<>(after.get(i)));
        for (int attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) Thread.sleep(25);
            List<List<String>> observed = snapshot(io);
            if (observed.equals(after)) {
                applied = next;
                pending = 0;
                save(path);
                return;
            }
            if (!observed.equals(before)) break;
        }
        throw new IOException("Unconfirmed write to " + FIELDS[i]);
    }

    public static void checkActive(Path stateDirectory, String boot, IO io) throws Exception {
        Txn txn = load(stateDirectory.resolve("txn.journal"));
        if (!txn.boot.equals(boot) || !txn.complete || txn.pending != 0
                || !txn.expected(txn.applied).equals(txn.expected(3))) {
            throw new IOException("Transaction is not fully active");
        }
        txn.verify(io);
    }

    public static void run(Path stateDirectory, String boot, String event,
                           List<String> selected, IO io) throws Exception {
        boolean enable = "enable".equals(event);
        if (!enable && !"disable".equals(event)) throw new IllegalArgumentException("Unknown event");
        Path path = stateDirectory.resolve("txn.journal");
        if (!enable && Files.notExists(path)) return;
        if (boot == null || boot.isEmpty()) throw new IllegalArgumentException("Missing boot");
        List<String> names = new ArrayList<>();
        if (enable) {
            for (String name : selected) {
                if (name == null || !name.matches("([\\p{javaJavaIdentifierStart}][\\p{javaJavaIdentifierPart}]*\\.)+[\\p{javaJavaIdentifierStart}][\\p{javaJavaIdentifierPart}]*"))
                    throw new IllegalArgumentException("Expected qualified class name");
                if (!names.contains(name)) names.add(name);
            }
        }
        Txn txn;
        if (!Files.notExists(path)) {
            txn = load(path);
            if (!boot.equals(txn.boot) || txn.pending != 0) throw new IOException("Boot mismatch or unresolved intent");
            txn.verify(io);
            if (enable) {
                if (txn.complete && names.equals(txn.selected)) return;
                throw new IOException("Existing transaction");
            }
            txn.complete = false;
            txn.save(path);
            for (int i = FIELDS.length - 1; i >= 0; i--) txn.change(path, io, i, false);
            txn.verify(io);
            Files.delete(path);
            syncDirectory(stateDirectory);
        } else {
            Files.createDirectories(stateDirectory);
            txn = new Txn(boot, names, snapshot(io));
            txn.verify(io);
            txn.save(path);
            for (int i = 0; i < FIELDS.length; i++) txn.change(path, io, i, true);
            txn.verify(io);
            txn.complete = true;
            txn.save(path);
        }
    }

    private static void syncDirectory(Path dir) throws IOException {
        try (FileChannel channel = FileChannel.open(dir, StandardOpenOption.READ)) {
            channel.force(true);
        }
    }

    private void save(Path path) throws IOException {
        Path tmp = Files.createTempFile(path.getParent(), ".txn-", ".tmp");
        try {
            try (FileOutputStream file = new FileOutputStream(tmp.toFile());
                 DataOutputStream out = new DataOutputStream(new BufferedOutputStream(file))) {
                out.writeInt(0x54584e31);
                out.writeUTF(boot);
                writeList(out, selected);
                for (List<String> list : original) writeList(out, list);
                out.writeByte(applied);
                out.writeByte(pending);
                out.writeBoolean(complete);
                out.flush();
                file.getFD().sync();
            }
            Files.move(tmp, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            syncDirectory(path.getParent());
        } finally {
            Files.deleteIfExists(tmp);
        }
    }

    private static void writeList(DataOutputStream out, List<String> list) throws IOException {
        out.writeInt(list.size());
        for (String value : list) {
            out.writeInt(value == null ? -1 : value.length());
            if (value != null) out.writeChars(value);
        }
    }

    private static List<String> readList(DataInputStream in) throws IOException {
        int count = in.readInt();
        if (count < 0) throw new IOException("Invalid count");
        List<String> result = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            int length = in.readInt();
            if (length < -1) throw new IOException("Invalid length");
            StringBuilder value = new StringBuilder();
            for (int j = 0; j < length; j++) value.append(in.readChar());
            result.add(length == -1 ? null : value.toString());
        }
        return result;
    }

    private static Txn load(Path path) throws IOException {
        try (DataInputStream in = new DataInputStream(new BufferedInputStream(Files.newInputStream(path)))) {
            if (in.readInt() != 0x54584e31) throw new IOException("Unknown journal format");
            String boot = in.readUTF();
            List<String> names = readList(in);
            Txn txn = new Txn(boot, names, Arrays.asList(readList(in), readList(in)));
            txn.applied = in.readUnsignedByte();
            txn.pending = in.readByte();
            txn.complete = in.readBoolean();
            if (txn.applied > 3 || in.read() != -1) throw new IOException("Invalid journal");
            return txn;
        }
    }
}
