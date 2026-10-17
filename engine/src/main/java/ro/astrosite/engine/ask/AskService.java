package ro.astrosite.engine.ask;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import ro.astrosite.engine.astro.BirthData;
import ro.astrosite.engine.scoring.Category;
import ro.astrosite.engine.scoring.DayScores;
import ro.astrosite.engine.scoring.DayScoreService;
import ro.astrosite.engine.scoring.Factor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** "Is it a good day to …?" — classification, guardrails, scoring, narration. */
@Service
public class AskService {

    private final DayScoreService dayScores;
    private final FactorTexts texts;
    private final TemplateNarrator templateNarrator;
    private final LlmNarrator llmNarrator;

    public AskService(DayScoreService dayScores, FactorTexts texts,
                      TemplateNarrator templateNarrator, LlmNarrator llmNarrator) {
        this.dayScores = dayScores;
        this.texts = texts;
        this.templateNarrator = templateNarrator;
        this.llmNarrator = llmNarrator;
    }

    @Cacheable(cacheNames = "askAnswers",
            key = "#birth.cacheKey() + '|' + #date + '|' + #locale + '|' + #question.trim().toLowerCase()")
    public AskAnswer ask(BirthData birth, LocalDate date, String question, Locale locale) {
        Guardrails.Flag flag = Guardrails.check(question);
        Category category = QuestionClassifier.classify(question);

        if (flag == Guardrails.Flag.DISTRESS) {
            return new AskAnswer(question, date, Category.WELLBEING, 0, DayScores.Verdict.MIXED, List.of(),
                    texts.message("guardrail.distress", locale), "guardrail", flag,
                    texts.message("disclaimer", locale), java.util.Map.of());
        }

        DayScores scores = dayScores.scores(birth, date);
        int score = scores.score(category);
        DayScores.Verdict verdict = DayScores.verdict(score);
        List<AskAnswer.Reason> reasons = reasons(scores, category, locale);

        String text = null;
        String narrator = "template";
        if (llmNarrator.enabled()) {
            text = llmNarrator.narrate(question, category, score, verdict, reasons, locale);
            if (text != null) narrator = "llm";
        }
        if (text == null) {
            text = templateNarrator.narrate(question, category, score, verdict, reasons, locale);
        }
        if (flag != Guardrails.Flag.NONE) {
            text = texts.message("guardrail." + flag.name().toLowerCase(), locale) + " " + text;
        }
        return new AskAnswer(question, date, category, score, verdict, reasons, text, narrator, flag,
                texts.message("disclaimer", locale), scores.context());
    }

    public List<AskAnswer.Reason> reasons(DayScores scores, Category category, Locale locale) {
        List<AskAnswer.Reason> out = new ArrayList<>();
        for (Factor f : scores.factorsFor(category)) {
            out.add(new AskAnswer.Reason(f.source().name(), texts.text(f, locale), f.weight()));
            if (out.size() >= 8) break;
        }
        return out;
    }

    /** Best days for a category in [from, from + days). */
    public List<BestDay> bestDays(BirthData birth, Category category, LocalDate from, int days, int limit, Locale locale) {
        List<BestDay> all = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate d = from.plusDays(i);
            DayScores s = dayScores.scores(birth, d);
            List<AskAnswer.Reason> rs = reasons(s, category, locale).stream().limit(3).toList();
            all.add(new BestDay(d, s.score(category), DayScores.verdict(s.score(category)), rs));
        }
        return all.stream()
                .sorted((a, b) -> b.score() != a.score() ? Integer.compare(b.score(), a.score()) : a.date().compareTo(b.date()))
                .limit(limit)
                .toList();
    }

    public record BestDay(LocalDate date, int score, DayScores.Verdict verdict, List<AskAnswer.Reason> reasons) {}
}
