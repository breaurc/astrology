package ro.astrosite.engine.reading;

import org.springframework.stereotype.Service;
import ro.astrosite.engine.ask.AskAnswer;
import ro.astrosite.engine.ask.FactorTexts;
import ro.astrosite.engine.ask.Guardrails;
import ro.astrosite.engine.ask.LlmClient;
import ro.astrosite.engine.ask.NarrationService;
import ro.astrosite.engine.ask.QuestionClassifier;
import ro.astrosite.engine.astro.BirthData;
import ro.astrosite.engine.scoring.Category;
import ro.astrosite.engine.scoring.DayScores;
import ro.astrosite.engine.scoring.DayScoreService;
import ro.astrosite.engine.scoring.Factor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * One turn of the paid conversation (SPEC section 3.4). The engine is stateless: the caller sends the thread
 * so far and gets the next reply. Guardrails run before any model call; the context is the person's chart
 * facts for all three systems, today's sky and the strongest factors for what the message is about.
 */
@Service
public class ChatService {

    public record Turn(String text, String narrator, Guardrails.Flag guardrail, Category category,
                       String disclaimer, NarrationService.Usage usage) {}

    private final DayScoreService dayScores;
    private final ReadingService readings;
    private final FactorTexts texts;
    private final NarrationService narration;

    public ChatService(DayScoreService dayScores, ReadingService readings, FactorTexts texts, NarrationService narration) {
        this.dayScores = dayScores;
        this.readings = readings;
        this.texts = texts;
        this.narration = narration;
    }

    public Turn reply(BirthData birth, LocalDate date, Locale locale, List<LlmClient.Message> history, String message) {
        Guardrails.Flag flag = Guardrails.check(message);
        if (flag == Guardrails.Flag.DISTRESS || flag == Guardrails.Flag.OFF_TOPIC) {
            return new Turn(texts.message("guardrail." + flag.name().toLowerCase(), locale), "guardrail", flag,
                    Category.GENERAL, texts.message("disclaimer", locale), null);
        }

        DayScores day = dayScores.scores(birth, date);
        Category category = QuestionClassifier.classify(message);
        int score = day.score(category);
        DayScores.Verdict verdict = DayScores.verdict(score);

        Set<Factor> picked = new LinkedHashSet<>();
        day.factorsFor(category).stream().limit(6).forEach(picked::add);
        day.factorsFor(Category.GENERAL).stream().limit(4).forEach(picked::add);
        List<AskAnswer.Reason> reasons = picked.stream()
                .map(f -> new AskAnswer.Reason(f.source().name(), texts.text(f, locale), f.weight())).toList();

        Map<String, Object> facts = readings.allFacts(birth, date, day);
        List<String> context = new ArrayList<>();
        if (birth.name() != null && !birth.name().isBlank()) context.add(texts.label("fact.name", locale) + ": " + birth.name());
        context.add(texts.label("fact.date", locale) + ": " + date);
        for (ReadingSystem s : ReadingSystem.values()) context.add(readings.factsText(s, facts, locale));

        NarrationService.Result n = narration.chat(String.join("\n", context), category, score, verdict, reasons, history, message, flag, locale);
        String text = n.text();
        if (flag != Guardrails.Flag.NONE) text = Guardrails.prefixed(texts.message("guardrail." + flag.name().toLowerCase(), locale), text);
        return new Turn(text, n.narrator(), flag, category, texts.message("disclaimer", locale), n.usage());
    }
}
