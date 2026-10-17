package ro.astrosite.engine.numerology;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Set;

/** Pure numerology arithmetic; no framework dependency. */
public final class Numerology {

    private static final Set<Integer> MASTER = Set.of(11, 22, 33);
    private static final String VOWELS = "AEIOUY";

    private Numerology() {}

    public static NumerologyProfile profile(String name, LocalDate birth, LocalDate reference) {
        int lifePath = reduce(reduce(birth.getMonthValue()) + reduce(birth.getDayOfMonth()) + reduce(birth.getYear()));
        int birthday = reduce(birth.getDayOfMonth());
        Integer expression = null, soulUrge = null, personality = null;
        if (name != null && !name.isBlank()) {
            String n = normalize(name);
            expression = reduce(sum(n, c -> true));
            soulUrge = reduce(sum(n, c -> VOWELS.indexOf(c) >= 0));
            personality = reduce(sum(n, c -> VOWELS.indexOf(c) < 0));
        }
        int personalYear = reduce(reduce(birth.getMonthValue()) + reduce(birth.getDayOfMonth()) + reduce(reference.getYear()));
        int personalMonth = reduce(personalYear + reference.getMonthValue());
        int personalDay = reduce(personalMonth + reference.getDayOfMonth());
        return new NumerologyProfile(lifePath, birthday, expression, soulUrge, personality,
                personalYear, personalMonth, personalDay);
    }

    /** Reduce to a single digit, keeping master numbers. */
    public static int reduce(int n) {
        n = Math.abs(n);
        while (n > 9 && !MASTER.contains(n)) {
            int s = 0;
            for (int x = n; x > 0; x /= 10) s += x % 10;
            n = s;
        }
        return n;
    }

    /** Pythagorean letter value 1..9. */
    public static int letterValue(char c) {
        if (c < 'A' || c > 'Z') return 0;
        return (c - 'A') % 9 + 1;
    }

    /** Strip diacritics (ă â î ș ț …), keep A–Z. */
    public static String normalize(String s) {
        String noMarks = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return noMarks.toUpperCase().replaceAll("[^A-Z]", "");
    }

    private interface CharFilter { boolean test(char c); }

    private static int sum(String normalized, CharFilter f) {
        int s = 0;
        for (char c : normalized.toCharArray()) if (f.test(c)) s += letterValue(c);
        return s;
    }

    /** Short keyword for each number, used by the scoring engine and narrators. */
    public static String theme(int n) {
        return switch (n) {
            case 1 -> "initiative";
            case 2 -> "cooperation";
            case 3 -> "social";
            case 4 -> "structure";
            case 5 -> "change";
            case 6 -> "home";
            case 7 -> "reflection";
            case 8 -> "ambition";
            case 9 -> "completion";
            case 11 -> "intuition";
            case 22 -> "building";
            case 33 -> "service";
            default -> "neutral";
        };
    }
}
