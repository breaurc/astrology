package ro.astrosite.engine.reading;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import ro.astrosite.engine.ask.AskAnswer;
import ro.astrosite.engine.ask.FactorTexts;
import ro.astrosite.engine.api.dto.SkyResponse;
import ro.astrosite.engine.ask.NarrationService;
import ro.astrosite.engine.astro.BirthData;
import ro.astrosite.engine.astro.ChartCalculator;
import ro.astrosite.engine.astro.NatalChart;
import ro.astrosite.engine.astro.Transits;
import ro.astrosite.engine.chinese.ChineseProfile;
import ro.astrosite.engine.chinese.ChineseService;
import ro.astrosite.engine.chinese.DayAlmanac;
import ro.astrosite.engine.numerology.Numerology;
import ro.astrosite.engine.numerology.NumerologyProfile;
import ro.astrosite.engine.scoring.Category;
import ro.astrosite.engine.scoring.DayScores;
import ro.astrosite.engine.scoring.DayScoreService;
import ro.astrosite.engine.scoring.Factor;
import ro.astrosite.engine.scoring.ScoringRules;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The free reading (SPEC section 3.1): computed facts for one system plus a short narration for the day.
 * Cached per (birth data, name, system, date, locale) until the hourly cache clear, so repeat visits and
 * system switches do not call the model again (SPEC section 7).
 */
@Service
public class ReadingService {

    /**
     * @param facts   computed, system-specific facts as enum keys the frontend localizes (sunSign, animal, lifePath …)
     * @param reasons the factors behind the mood, strongest first, localized
     * @param sky     the day's planets over the natal chart, for the wheel; only with the western reading
     */
    public record Reading(ReadingSystem system, LocalDate date, Map<String, Object> facts, int score,
                          DayScores.Verdict verdict, List<AskAnswer.Reason> reasons, String text, String narrator,
                          String disclaimer, NarrationService.Usage usage, SkyResponse sky) {}

    private final ChartCalculator calculator = new ChartCalculator();
    private final ChineseService chinese;
    private final DayScoreService dayScores;
    private final FactorTexts texts;
    private final NarrationService narration;

    public ReadingService(ChineseService chinese, DayScoreService dayScores, FactorTexts texts, NarrationService narration) {
        this.chinese = chinese;
        this.dayScores = dayScores;
        this.texts = texts;
        this.narration = narration;
    }

    @Cacheable(cacheNames = "readings",
            key = "#birth.cacheKey() + '|' + #birth.name() + '|' + #system + '|' + #date + '|' + #locale")
    public Reading reading(BirthData birth, ReadingSystem system, LocalDate date, Locale locale) {
        DayScores day = dayScores.scores(birth, date);
        Map<String, Object> facts = facts(birth, system, date, day);

        List<Factor> relevant = day.factors().stream()
                .filter(f -> f.source() == system.source())
                .sorted(Comparator.comparingDouble((Factor f) -> Math.abs(f.weight())).reversed())
                .toList();
        int score = ScoringRules.aggregate(relevant).getOrDefault(Category.GENERAL, 5);
        DayScores.Verdict verdict = DayScores.verdict(score);
        List<AskAnswer.Reason> reasons = relevant.stream().limit(6)
                .map(f -> new AskAnswer.Reason(f.source().name(), texts.text(f, locale), f.weight())).toList();

        NarrationService.Result n = narration.reading(system, factsText(system, facts, locale), score, verdict, reasons, locale);
        return new Reading(system, date, facts, score, verdict, reasons, n.text(), n.narrator(),
                texts.message("disclaimer", locale), n.usage(), system == ReadingSystem.WESTERN ? sky(birth, date) : null);
    }

    /** The day's sky over the natal chart (positions, natal houses, transit aspects). Pure computation. */
    public SkyResponse sky(BirthData birth, LocalDate date) {
        NatalChart natal = calculator.compute(birth);
        NatalChart transit = calculator.compute(Transits.noon(birth, date));
        return SkyResponse.of(natal, transit, date);
    }

    /** Facts for all three systems in one map; used as chat context and by the profile page. */
    public Map<String, Object> allFacts(BirthData birth, LocalDate date, DayScores day) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (ReadingSystem s : ReadingSystem.values()) out.putAll(facts(birth, s, date, day));
        return out;
    }

    Map<String, Object> facts(BirthData birth, ReadingSystem system, LocalDate date, DayScores day) {
        Map<String, Object> f = new LinkedHashMap<>();
        switch (system) {
            case WESTERN -> {
                NatalChart natal = calculator.compute(birth);
                f.put("sunSign", natal.sunSign().name());
                f.put("moonSign", natal.moonSign().name());
                if (natal.risingSign() != null) f.put("risingSign", natal.risingSign().name());
                f.put("transitMoonSign", day.context().get("transitMoonSign"));
                f.put("moonPhase", day.context().get("moonPhase"));
                String retro = day.context().getOrDefault("retrogrades", "");
                f.put("retrogrades", retro.isBlank() ? List.of() : List.of(retro.split(",")));
            }
            case CHINESE -> {
                ChineseProfile p = chinese.profile(birth);
                DayAlmanac a = chinese.almanac(date, p);
                f.put("animal", p.animal());
                f.put("element", p.element());
                f.put("yinYang", p.yinYang());
                f.put("dayAnimal", a.dayAnimal());
                f.put("relation", a.relationToNatal().name());
                f.put("auspiciousDay", a.auspiciousDay());
                f.put("favorable", a.favorable().stream().filter(c -> c != Category.GENERAL).map(Enum::name).toList());
                f.put("unfavorable", a.unfavorable().stream().filter(c -> c != Category.GENERAL).map(Enum::name).toList());
            }
            case NUMEROLOGY -> {
                NumerologyProfile n = Numerology.profile(birth.name(), birth.date(), date);
                f.put("lifePath", n.lifePath());
                f.put("birthday", n.birthday());
                if (n.expression() != null) f.put("expression", n.expression());
                f.put("personalYear", n.personalYear());
                f.put("personalMonth", n.personalMonth());
                f.put("personalDay", n.personalDay());
            }
        }
        return f;
    }

    /** Localized, one fact per line: what the model is allowed to talk about. */
    public String factsText(ReadingSystem system, Map<String, Object> facts, Locale locale) {
        List<String> lines = new ArrayList<>();
        switch (system) {
            case WESTERN -> {
                lines.add(texts.label("fact.sunSign", locale) + ": " + label(facts.get("sunSign"), locale));
                lines.add(texts.label("fact.moonSign", locale) + ": " + label(facts.get("moonSign"), locale));
                if (facts.get("risingSign") != null) lines.add(texts.label("fact.risingSign", locale) + ": " + label(facts.get("risingSign"), locale));
                lines.add(texts.label("fact.transitMoon", locale) + ": " + label(facts.get("transitMoonSign"), locale)
                        + " (" + texts.label("phase." + facts.get("moonPhase"), locale) + ")");
                Object retro = facts.get("retrogrades");
                if (retro instanceof List<?> l && !l.isEmpty()) {
                    lines.add(texts.label("fact.retrogrades", locale) + ": "
                            + String.join(", ", l.stream().map(x -> label(x, locale)).toList()));
                }
            }
            case CHINESE -> {
                lines.add(texts.label("fact.animal", locale) + ": " + label(facts.get("animal"), locale)
                        + " (" + label(facts.get("yinYang"), locale) + " " + label(facts.get("element"), locale) + ")");
                lines.add(texts.label("fact.dayAnimal", locale) + ": " + label(facts.get("dayAnimal"), locale)
                        + ", " + texts.label("relation." + facts.get("relation"), locale));
                if (facts.get("favorable") instanceof List<?> l && !l.isEmpty())
                    lines.add(texts.label("fact.favorable", locale) + ": " + String.join(", ", l.stream().map(x -> label(x, locale)).toList()));
                if (facts.get("unfavorable") instanceof List<?> l && !l.isEmpty())
                    lines.add(texts.label("fact.unfavorable", locale) + ": " + String.join(", ", l.stream().map(x -> label(x, locale)).toList()));
            }
            case NUMEROLOGY -> {
                lines.add(texts.label("fact.lifePath", locale) + ": " + facts.get("lifePath"));
                lines.add(texts.label("fact.birthday", locale) + ": " + facts.get("birthday"));
                if (facts.get("expression") != null) lines.add(texts.label("fact.expression", locale) + ": " + facts.get("expression"));
                lines.add(texts.label("fact.personalDay", locale) + ": " + facts.get("personalDay")
                        + " (" + texts.label("fact.personalMonth", locale) + " " + facts.get("personalMonth")
                        + ", " + texts.label("fact.personalYear", locale) + " " + facts.get("personalYear") + ")");
            }
        }
        return String.join("\n", lines);
    }

    private String label(Object key, Locale locale) {
        return key == null ? "" : texts.label(String.valueOf(key), locale);
    }
}
