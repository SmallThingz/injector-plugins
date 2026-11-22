import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class ParcelCapacityTest {
    public static void main(String[] args) throws Exception {
        ParcelCapacity.Size empty = ParcelCapacity.estimate(Collections.emptyList(), 0);
        check(empty.requestBytes == 80 && empty.replyBytes == 8);
        check(empty.requestHeadroomBytes() == 1024 * 1024 - 80);

        List<String> values = Arrays.asList(null, "", "x", "xx", "xx", "\uD83D\uDE00", "\uD800");
        ParcelCapacity.Size payload = ParcelCapacity.estimate(values, 0);
        // List framing plus UTF-16 length, terminator and alignment per entry.
        check(payload.requestBytes - empty.requestBytes == 4 + 8 + 8 + 12 + 12 + 12 + 8);
        check(payload.replyBytes - empty.replyBytes == payload.requestBytes - empty.requestBytes);

        String a = new String(new char[128]).replace('\0', 'a');
        List<String> realistic = Collections.nCopies(1500, a);
        ParcelCapacity.Size large = ParcelCapacity.estimate(realistic, 0);
        check(large.requestBytes > 256 * 1024);
        check(large.replyHeadroomBytes() > 0);

        int nominal = ParcelCapacity.NOMINAL_BINDER_BYTES;
        int fitUnits = (nominal - empty.requestBytes - 4) / 2 - 1;
        String boundary = new String(new char[fitUnits]);
        check(ParcelCapacity.estimate(Collections.singletonList(boundary), 0).requestBytes == nominal);
        reject(Collections.singletonList(boundary + "x"), 0);
        check(ParcelCapacity.estimate(realistic, large.replyBytes).replyHeadroomBytes() == 0);
        reject(realistic, large.replyBytes - 1);
        reject(null, 0);

        String mapping = "1b100000-1b1fe000 r--p 00000000 00:05 417 /dev/binder\n";
        String hardware = "1b200000-1b2fe000 r--p 00000000 00:05 418 /dev/hwbinder\n";
        check(mappingBytes(mapping + hardware) == 1040384);
        check(mappingBytes(mapping.replace("/dev/binder", "/dev/binderfs/binder")) == 1040384);
        check(mappingBytes(hardware) == 0);
        check(mappingBytes(mapping + mapping) == 0);
        check(mappingBytes(mapping.replace("1b100000", "badhex")) == 0);
        System.out.println("Parcel framing, capacity, mapping and aggregate diagnostics checks passed");
    }

    private static int mappingBytes(String maps) throws IOException {
        return ParcelCapacity.binderMappingBytes(new BufferedReader(new StringReader(maps)));
    }

    private static void reject(List<String> values, int mapping) throws IOException {
        try {
            ParcelCapacity.estimate(values, mapping);
            throw new AssertionError("Expected size rejection");
        } catch (IOException expected) {
            check(expected.getMessage().contains(values == null ? "Missing vendor list" : "Binder envelope"));
        }
    }

    private static void check(boolean condition) {
        if (!condition) throw new AssertionError();
    }
}
