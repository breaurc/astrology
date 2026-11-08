package ro.astrosite.engine.ask;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import ro.astrosite.engine.config.LlmProperties;
import ro.astrosite.engine.reading.ReadingSystem;
import ro.astrosite.engine.scoring.Category;
import ro.astrosite.engine.scoring.DayScores;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicLong;

/**
 * All narration goes through here (HLD section 6). Three modes, each with its own versioned system prompt and
 * output cap; the astrological facts are computed first and handed to the model as structured context, so the
 * model writes but never calculates.
 * <ul>
 *   <li>{@code READING}: ~4 lines for the landing page; falls back to templates when the LLM is off, over budget or failing.</li>
 *   <li>{@code ANSWER}: the daily question; templates when the LLM is not configured, 503 when it is configured but fails.</li>
 *   <li>{@code CHAT}: one conversation turn; same policy as ANSWER.</li>
 * </ul>
 * A daily token ceiling (astro.llm.daily-token-ceiling) bounds spend: when reached, READING uses templates and the
 * other modes throw {@link BudgetExceededException}. Every call logs model, tokens and latency.
 */
@Service
public class NarrationService {

    private static final Logger log = LoggerFactory.getLogger(NarrationService.class);

    public enum Mode { READING, ANSWER, CHAT }

    /** Cost record for the row that stores the result (HLD section 5). Null when a template answered. */
    public record Usage(String model, int tokensIn, int tokensOut, long latencyMs) {}

    /** @param narrator "llm" or "template" */
    public record Result(String text, String narrator, Usage usage) {}

    private final LlmClient llm;
    private final Prompts prompts;
    private final TemplateNarrator template;
    private final FactorTexts texts;
    private final LlmProperties props;

    private final AtomicLong tokensToday = new AtomicLong();
    private volatile LocalDate budgetDay = LocalDate.now(ZoneOffset.UTC);

    public NarrationService(LlmClient llm, Prompts prompts, TemplateNarrator template, FactorTexts texts, LlmProperties props) {
        this.llm = llm;
        this.prompts = prompts;
        this.template = template;
        this.texts = texts;
        this.props = props;
    }

    // ------------------------------------------------------------------ reading

    public Result reading(ReadingSystem system, String factsText, int score, DayScores.Verdict verdict,
                          List<AskAnswer.Reason> reasons, Locale locale) {
        Result fallback = new Result(template.narrateReading(system, score, verdict, reasons, locale), "template", null);
        if (!llm.enabled() || overBudget()) return fallback;
        String user = "System: " + texts.label("system." + system.name(), locale) + "\n"
                + "Facts:\n" + factsText + "\n"
                + "Overall mood: " + verdict + "\n"
                + "Computed factors (strongest first):\n" + factorLines(reasons);
        try {
            return run(Mode.READING, List.of(new LlmClient.Message("user", user)), props.maxTokensReading(), locale);
        } catch (RuntimeException e) {
            return fallback;
        }
    }

    // ------------------------------------------------------------------ answer

    public Result answer(String question, Category category, int score, DayScores.Verdict verdict,
                         List<AskAnswer.Reason> reasons, Locale locale) {
        if (!llm.enabled()) {
            return new Result(template.narrate(question, category, score, verdict, reasons, locale), "template", null);
        }
        if (overBudget()) throw new BudgetExceededException();
        String user = "Question: " + question + "\n"
                + "Category: " + texts.label(category.name(), locale) + "\n"
                + "Score: " + score + "/10 (" + verdict + ")\n"
                + "Computed factors (strongest first):\n" + factorLines(reasons);
        try {
            return run(Mode.ANSWER, List.of(new LlmClient.Message("user", user)), props.maxTokensAnswer(), locale);
        } catch (RuntimeException e) {
            throw new NarrationUnavailableException(e);
        }
    }

    // ------------------------------------------------------------------ chat

    /**
     * @param context  chart facts and today's sky, already localized, one fact per line
     * @param history  previous turns, oldest first (roles "user" / "assistant")
     */
    public Result chat(String context, Category category, int score, DayScores.Verdict verdict,
                       List<AskAnswer.Reason> reasons, List<LlmClient.Message> history, String message, Locale locale) {
        if (!llm.enabled()) {
            return new Result(template.narrate(message, category, score, verdict, reasons, locale), "template", null);
        }
        if (overBudget()) throw new BudgetExceededException();
        List<LlmClient.Message> messages = new ArrayList<>();
        String contextBlock = "Context about the person (computed, use only this):\n" + context + "\n"
                + "Today's strongest factors for " + texts.label(category.name(), locale) + " (" + score + "/10, " + verdict + "):\n"
                + factorLines(reasons);
        // The context travels as the first user turn so it works the same on both providers.
        messages.add(new LlmClient.Message("user", contextBlock));
        messages.add(new LlmClient.Message("assistant", "Understood. I will only use these facts."));
        int from = Math.max(0, history.size() - 12);
        for (LlmClient.Message m : history.subList(from, history.size())) {
            messages.add(new LlmClient.Message("assistant".equals(m.role()) ? "assistant" : "user", m.content()));
        }
        messages.add(new LlmClient.Message("user", message));
        try {
            return run(Mode.CHAT, messages, props.maxTokensChat(), locale);
        } catch (RuntimeException e) {
            throw new NarrationUnavailableException(e);
        }
    }

    // ------------------------------------------------------------------ internals

    private Result run(Mode mode, List<LlmClient.Message> messages, int maxTokens, Locale locale) {
        LlmClient.Completion c = llm.complete(prompts.system(mode, locale), messages, maxTokens);
        record(c);
        log.info("narration mode={} model={} tokens_in={} tokens_out={} latency_ms={}",
                mode, c.model(), c.tokensIn(), c.tokensOut(), c.latencyMs());
        return new Result(c.text(), "llm", new Usage(c.model(), c.tokensIn(), c.tokensOut(), c.latencyMs()));
    }

    private static String factorLines(List<AskAnswer.Reason> reasons) {
        StringBuilder sb = new StringBuilder();
        for (AskAnswer.Reason r : reasons) {
            sb.append("- [").append(r.source()).append(", ").append(r.weight() > 0 ? "+" : "")
                    .append(String.format(Locale.ROOT, "%.1f", r.weight())).append("] ").append(r.text()).append('\n');
        }
        return sb.toString();
    }

    private void record(LlmClient.Completion c) {
        rollDay();
        tokensToday.addAndGet((long) c.tokensIn() + c.tokensOut());
    }

    /** True when the daily ceiling is configured and reached. */
    public boolean overBudget() {
        rollDay();
        long ceiling = props.dailyTokenCeiling();
        return ceiling > 0 && tokensToday.get() >= ceiling;
    }

    private void rollDay() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (!today.equals(budgetDay)) {
            synchronized (this) {
                if (!today.equals(budgetDay)) {
                    budgetDay = today;
                    tokensToday.set(0);
                }
            }
        }
    }
}
