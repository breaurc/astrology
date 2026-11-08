package ro.astrosite.engine.reading;

import org.springframework.stereotype.Service;
import ro.astrosite.engine.ask.FactorTexts;
import ro.astrosite.engine.astro.BirthData;
import ro.astrosite.engine.scoring.Category;
import ro.astrosite.engine.scoring.DayScores;
import ro.astrosite.engine.scoring.DayScoreService;
import ro.astrosite.engine.scoring.Factor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The 7-day calendar (SPEC section 3.2): one verdict per day with "good for / avoid" lists, computed from
 * transits against the chart. No LLM call, so it is free to serve; day scores are cached per person and day.
 */
@Service
public class CalendarService {

    /**
     * @param good   category keys worth pursuing that day (best first), localized by the frontend
     * @param avoid  category keys to be careful with (worst first)
     * @param scores 1..10 per category
     * @param reasons the two strongest localized factors of the day
     */
    public record CalendarDay(LocalDate date, int score, DayScores.Verdict verdict, List<String> good, List<String> avoid,
                              Map<String, Integer> scores, List<String> reasons) {}

    private final DayScoreService dayScores;
    private final FactorTexts texts;

    public CalendarService(DayScoreService dayScores, FactorTexts texts) {
        this.dayScores = dayScores;
        this.texts = texts;
    }

    public List<CalendarDay> calendar(BirthData birth, LocalDate from, int days, Locale locale) {
        List<CalendarDay> out = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate d = from.plusDays(i);
            DayScores s = dayScores.scores(birth, d);
            int overall = s.score(Category.GENERAL);

            List<Category> ranked = new ArrayList<>();
            for (Category c : Category.values()) if (c != Category.GENERAL) ranked.add(c);
            ranked.sort(Comparator.comparingInt((Category c) -> s.score(c)).reversed());

            List<String> good = ranked.stream().filter(c -> s.score(c) >= 6).limit(3).map(Enum::name).toList();
            List<String> avoid = ranked.reversed().stream().filter(c -> s.score(c) <= 5).limit(3).map(Enum::name).toList();

            Map<String, Integer> scores = new LinkedHashMap<>();
            for (Category c : Category.values()) scores.put(c.name(), s.score(c));

            List<String> reasons = s.factorsFor(Category.GENERAL).stream().limit(2)
                    .map((Factor f) -> texts.text(f, locale)).toList();

            out.add(new CalendarDay(d, overall, DayScores.verdict(overall), good, avoid, scores, reasons));
        }
        return out;
    }
}
