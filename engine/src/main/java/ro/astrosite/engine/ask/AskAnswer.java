package ro.astrosite.engine.ask;

import ro.astrosite.engine.scoring.Category;
import ro.astrosite.engine.scoring.DayScores;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Answer to a free-text question.
 *
 * @param reasons   localized, human-readable factors (strongest first)
 * @param text      the narrative answer
 * @param narrator  "template" or "llm"
 * @param guardrail NONE, or the flag that limited the answer
 */
public record AskAnswer(String question, LocalDate date, Category category, int score,
                        DayScores.Verdict verdict, List<Reason> reasons, String text,
                        String narrator, Guardrails.Flag guardrail, String disclaimer,
                        Map<String, String> context) {

    public record Reason(String source, String text, double weight) {}
}
