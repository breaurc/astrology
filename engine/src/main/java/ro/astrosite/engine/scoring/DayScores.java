package ro.astrosite.engine.scoring;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Scores for one person and one day.
 *
 * @param scores  1..10 per category
 * @param factors all factors that were considered (each lists its categories)
 */
public record DayScores(LocalDate date, Map<Category, Integer> scores, List<Factor> factors,
                        Map<String, String> context) {

    public int score(Category c) { return scores.getOrDefault(c, 5); }

    /** Factors relevant to a category, strongest first. */
    public List<Factor> factorsFor(Category c) {
        return factors.stream()
                .filter(f -> f.categories().contains(c) || c == Category.GENERAL)
                .sorted((a, b) -> Double.compare(Math.abs(b.weight()), Math.abs(a.weight())))
                .toList();
    }

    public static Verdict verdict(int score) {
        if (score >= 7) return Verdict.GOOD;
        if (score <= 4) return Verdict.CAUTION;
        return Verdict.MIXED;
    }

    public enum Verdict { GOOD, MIXED, CAUTION }
}
