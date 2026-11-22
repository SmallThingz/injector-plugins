import java.util.LinkedHashSet;
import java.util.List;
import java.util.ArrayList;

final class Components {
    interface Resolver { String resolve(String component) throws Exception; }

    static String canonical(String component) {
        String[] parts = component.split("/", -1);
        if (parts.length != 2 || !parts[0].matches("[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+"))
            throw new IllegalArgumentException("Expected package/activity");
        String cls = parts[1].startsWith(".") ? parts[0] + parts[1] : parts[1];
        if (!cls.matches("[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)+"))
            throw new IllegalArgumentException("Expected an exact activity class");
        return parts[0] + "/" + cls;
    }

    static List<String> classes(String input, Resolver resolver) throws Exception {
        if (input == null || input.trim().isEmpty() || input.length() > 8192)
            throw new IllegalArgumentException("Enter the installed package/activity components");
        LinkedHashSet<String> components = new LinkedHashSet<>();
        for (String item : input.trim().split("[,\\s]+"))
            components.add(canonical(item));
        LinkedHashSet<String> classes = new LinkedHashSet<>();
        for (String item : components) {
            if (!item.equals(canonical(resolver.resolve(item))))
                throw new IllegalStateException("Installed activity differs from selection");
            classes.add(item.substring(item.indexOf('/') + 1));
        }
        return new ArrayList<>(classes);
    }
}
