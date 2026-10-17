package ro.astrosite.engine.ask;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import ro.astrosite.engine.config.LlmProperties;
import ro.astrosite.engine.scoring.Category;
import ro.astrosite.engine.scoring.DayScores;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Narrator backed by an LLM. Enabled only when astro.llm.api-key is set.
 * Supports the Anthropic Messages API (provider=anthropic) and OpenRouter's OpenAI-compatible
 * chat completions endpoint (provider=openrouter), which gives access to any OpenRouter model.
 * The model is told to use ONLY the computed reasons, so the text stays grounded in the charts.
 * Any failure returns null and the caller falls back to the template narrator.
 */
@Component
public class LlmNarrator implements Narrator {

    private static final Logger log = LoggerFactory.getLogger(LlmNarrator.class);
    /**
     * Generous cap: reasoning models (e.g. DeepSeek V4) spend hidden "reasoning" tokens before the
     * answer, and a tight cap can leave the visible content empty. Billing is per token used.
     */
    private static final int MAX_TOKENS = 1500;

    private final LlmProperties props;
    private final RestClient client;

    public LlmNarrator(LlmProperties props) {
        this.props = props;
        this.client = RestClient.builder().baseUrl(props.baseUrl()).build();
    }

    public boolean enabled() {
        return props.apiKey() != null && !props.apiKey().isBlank();
    }

    @Override
    public String name() { return "llm"; }

    @Override
    public String narrate(String question, Category category, int score, DayScores.Verdict verdict,
                          List<AskAnswer.Reason> reasons, Locale locale) {
        if (!enabled()) return null;
        String lang = "ro".equals(locale.getLanguage()) ? "Romanian" : "English";
        StringBuilder facts = new StringBuilder();
        for (AskAnswer.Reason r : reasons) {
            facts.append("- [").append(r.source()).append(", ").append(r.weight() > 0 ? "+" : "")
                    .append(r.weight()).append("] ").append(r.text()).append('\n');
        }
        String system = """
                You write short, warm answers for an astrology website. Answer in %s.
                Rules: use ONLY the computed factors given; never invent planets, aspects or numbers.
                Never give medical, legal or financial advice. 90-130 words, second person, no headings,
                no bullet lists. Start with a clear verdict, then the two or three strongest reasons,
                then one practical suggestion. Mention the score once as "X/10".
                """.formatted(lang);
        String user = """
                Question: %s
                Category: %s
                Score: %d/10 (%s)
                Computed factors (strongest first):
                %s""".formatted(question, category, score, verdict, facts);

        try {
            String text = props.openRouter() ? openRouter(system, user) : anthropic(system, user);
            if (text == null || text.isBlank()) {
                log.warn("LLM narration ({}, {}) returned no text, falling back to template", props.provider(), props.model());
                return null;
            }
            return text.trim();
        } catch (Exception e) {
            log.warn("LLM narration ({}, {}) failed, falling back to template: {}",
                    props.provider(), props.model(), e.toString());
            return null;
        }
    }

    /** Anthropic Messages API: POST /v1/messages. */
    @SuppressWarnings("unchecked")
    private String anthropic(String system, String user) {
        Map<String, Object> body = Map.of(
                "model", props.model(),
                "max_tokens", MAX_TOKENS,
                "system", system,
                "messages", List.of(Map.of("role", "user", "content", user)));
        Map<String, Object> resp = client.post()
                .uri("/v1/messages")
                .header("x-api-key", props.apiKey())
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .body(body)
                .retrieve()
                .body(Map.class);
        if (resp == null) return null;
        List<Map<String, Object>> content = (List<Map<String, Object>>) resp.get("content");
        if (content == null || content.isEmpty()) return null;
        Object text = content.get(0).get("text");
        return text == null ? null : text.toString();
    }

    /** OpenRouter (OpenAI-compatible): POST /api/v1/chat/completions with a Bearer token. */
    @SuppressWarnings("unchecked")
    private String openRouter(String system, String user) {
        Map<String, Object> body = Map.of(
                "model", props.model(),
                "max_tokens", MAX_TOKENS,
                "messages", List.of(
                        Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", user)));
        Map<String, Object> resp = client.post()
                .uri("/api/v1/chat/completions")
                .header("Authorization", "Bearer " + props.apiKey())
                .header("X-Title", "astro-site") // optional OpenRouter attribution header
                .header("content-type", "application/json")
                .body(body)
                .retrieve()
                .body(Map.class);
        if (resp == null) return null;
        List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.get("choices");
        if (choices == null || choices.isEmpty()) return null;
        Map<String, Object> choice = choices.get(0);
        Map<String, Object> message = (Map<String, Object>) choice.get("message");
        if (message == null) return null;
        Object content = message.get("content");
        if (content == null || content.toString().isBlank()) {
            log.warn("OpenRouter ({}) returned empty content: finish_reason={}, usage={}",
                    props.model(), choice.get("finish_reason"), resp.get("usage"));
            return null;
        }
        if ("length".equals(choice.get("finish_reason"))) {
            log.warn("OpenRouter ({}) hit max_tokens={}, answer may be truncated", props.model(), MAX_TOKENS);
        }
        return content.toString();
    }
}
