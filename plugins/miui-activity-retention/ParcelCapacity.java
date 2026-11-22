import android.os.Parcel;
import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

/** Preflight for the two reviewed IActivityManager List<String> transactions. */
public final class ParcelCapacity {
    public static final int NOMINAL_BINDER_BYTES = 1024 * 1024;
    private static final String DESCRIPTOR = "android.app.IActivityManager";
    private static final int TOKEN_HEADER_BYTES = 3 * Integer.BYTES;

    private ParcelCapacity() {}

    public static final class Size {
        public final int requestBytes;
        public final int replyBytes;
        public final int replyMappingBytes;

        private Size(int requestBytes, int replyBytes, int replyMappingBytes) {
            this.requestBytes = requestBytes;
            this.replyBytes = replyBytes;
            this.replyMappingBytes = replyMappingBytes;
        }

        /** Headroom to the nominal receiver mapping, before shared Binder allocations. */
        public int requestHeadroomBytes() {
            return NOMINAL_BINDER_BYTES - requestBytes;
        }

        /** Headroom to the observed client mapping, or its nominal size if unobservable. */
        public int replyHeadroomBytes() {
            return replyLimit(replyMappingBytes) - replyBytes;
        }

        @Override
        public String toString() {
            return "setter " + requestBytes + " bytes, nominal headroom "
                    + requestHeadroomBytes() + " bytes, getter " + replyBytes
                    + " bytes, " + (replyMappingBytes == 0 ? "nominal" : "mapped")
                    + " headroom " + replyHeadroomBytes() + " bytes";
        }
    }

    /** Check the setter request and the normal getter reply before submitting a full list. */
    public static Size check(List<String> list) throws IOException {
        int replyMappingBytes = clientMappingBytes();
        // Bound the payload before allocating a native Parcel.
        estimate(list, replyMappingBytes);
        Parcel parcel = Parcel.obtain();
        try {
            parcel.writeInterfaceToken(DESCRIPTOR);
            parcel.writeStringList(list);
            int requestBytes = parcel.dataSize();

            parcel.setDataPosition(0);
            parcel.setDataSize(0);
            parcel.writeNoException();
            parcel.writeStringList(list);
            int replyBytes = parcel.dataSize();
            return checked(requestBytes, replyBytes, replyMappingBytes);
        } finally {
            parcel.recycle();
        }
    }

    static Size estimate(List<String> list, int replyMappingBytes) throws IOException {
        if (list == null) throw new IOException("Missing vendor list");
        long requestBytes = TOKEN_HEADER_BYTES + stringBytes(DESCRIPTOR) + Integer.BYTES;
        long replyBytes = 2 * Integer.BYTES;
        for (String value : list) {
            long bytes = stringBytes(value);
            requestBytes += bytes;
            replyBytes += bytes;
            if (requestBytes > NOMINAL_BINDER_BYTES || replyBytes > replyLimit(replyMappingBytes)) {
                throw capacityExceeded(requestBytes, replyBytes, replyMappingBytes);
            }
        }
        return checked(requestBytes, replyBytes, replyMappingBytes);
    }

    static long stringBytes(String value) {
        if (value == null) return Integer.BYTES;
        long terminatedUtf16Bytes = 2L * (value.length() + 1L);
        return Integer.BYTES + ((terminatedUtf16Bytes + 3L) & ~3L);
    }

    private static int replyLimit(int mappingBytes) {
        return mappingBytes > 0 ? mappingBytes : NOMINAL_BINDER_BYTES;
    }

    private static Size checked(long request, long reply, int mappingBytes) throws IOException {
        if (request > NOMINAL_BINDER_BYTES || reply > replyLimit(mappingBytes)) {
            throw capacityExceeded(request, reply, mappingBytes);
        }
        return new Size((int) request, (int) reply, mappingBytes);
    }

    private static IOException capacityExceeded(long request, long reply, int mappingBytes) {
        return new IOException("Vendor list exceeds Binder envelope (setter " + request + "/"
                + NOMINAL_BINDER_BYTES + " bytes, getter " + reply + "/"
                + replyLimit(mappingBytes) + " bytes at the point rejected)");
    }

    private static int clientMappingBytes() {
        try (BufferedReader maps = Files.newBufferedReader(Paths.get("/proc/self/maps"),
                StandardCharsets.US_ASCII)) {
            return binderMappingBytes(maps);
        } catch (IOException | SecurityException unavailable) {
            return 0;
        }
    }

    static int binderMappingBytes(BufferedReader maps) throws IOException {
        int result = 0;
        for (String line; (line = maps.readLine()) != null;) {
            String[] fields = line.trim().split("\\s+", 6);
            if (fields.length != 6 || !fields[1].equals("r--p")
                    || !(fields[5].equals("/dev/binder") || fields[5].equals("/dev/binderfs/binder"))) {
                continue;
            }
            String[] range = fields[0].split("-", 2);
            if (result != 0 || range.length != 2) return 0;
            try {
                long start = Long.parseUnsignedLong(range[0], 16);
                long end = Long.parseUnsignedLong(range[1], 16);
                long size = end - start;
                if (size <= 0 || size > Integer.MAX_VALUE) return 0;
                result = (int) size;
            } catch (NumberFormatException invalid) {
                return 0;
            }
        }
        return result;
    }
}
