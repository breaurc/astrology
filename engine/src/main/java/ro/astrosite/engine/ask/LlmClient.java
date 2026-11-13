package ro.astrosite.engine.ask;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.ClientHttpRequestFactories;
import org.springframework.boot.web.client.ClientHttpRequestFactorySettings;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import ro.astrosite.engine.config.LlmProperties;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Thin HTTP client for the configured LLM provider. Enabled only when astro.llm.api-key is set.
 * Supports the Anthropic Messages API (provider=anthropic) and the OpenAI-compatible chat
 * completions endpoint of OpenRouter (provider=openrouter). Every call has a read timeout
 * (astro.llm.timeout-ms) and reports token usage so cost per feature can be logged by the caller.
 */
@Component
public class LlmClient {

    private static final Logger log = LoggerFactory.getLogger(LlmClient.class);

    public record Message(String role, String content) {}

    /** Token counts as reported by the provider (0 when missing). */
    public record Completion(String text, String model, int tokensIn, int tokensOut, long latencyMs) {}

    private final LlmProperties props;
    private final RestClient client;

    public LlmClient(LlmProperties props) {
        this.props = props;
        var settings = ClientHttpRequestFactorySettings.DEFAULTS
                .withConnectTimeout(Duration.ofSeconds(5))
                .withReadTimeout(Duration.ofMillis(props.timeoutMs()));
        this.client = RestClient.builder()
                .baseUrl(props.baseUrl())
                .requestFactory(ClientHttpRequestFactories.get(settings))
                .build();
    }

    public boolean enabled() { return props.enabled(); }

    /**
     * Runs one completion. Tries the configured model, then the fallback model (if any) on failure.
     *
     * @throws RuntimeException when the client is disabled or every attempt failed
     */
    public Completion complete(String system, List<Message> messages, int maxTokens) {
        if (!enabled()) throw new IllegalStateException("LLM narration is not configured");
        List<String> models = new ArrayList<>();
        models.add(props.model());
        if (props.fallbackModel() != null && !props.fallbackModel().equals(props.model())) models.add(props.fallbackModel());
        RuntimeException last = null;
        for (String model : models) {
            long t0 = System.currentTimeMillis();
            try {
                Completion c = props.openRouter()
                        ? openRouter(model, system, messages, maxTokens)
                        : anthropic(model, system, messages, maxTokens);
                if (c == null || c.text() == null || c.text().isBlank()) {
                    log.warn("LLM ({}, {}) returned no text", props.provider(), model);
                    last = new IllegalStateException("empty completion from " + model);
                    continue;
                }
                return new Completion(c.text().trim(), model, c.tokensIn(), c.tokensOut(), System.currentTimeMillis() - t0);
            } catch (RuntimeException e) {
                log.warn("LLM ({}, {}) failed after {} ms: {}", props.provider(), model, System.currentTimeMillis() - t0, e.toString());
                last = e;
            }
        }
        throw last != null ? last : new IllegalStateException("no model configured");
    }

    /** Anthropic Messages API: POST /v1/messages. */
    @SuppressWarnings("unchecked")
    private Completion anthropic(String model, String system, List<Message> messages, int maxTokens) {
        List<Map<String, String>> msgs = messages.stream().map(m -> Map.of("role", m.role(), "content", m.content())).toList();
        Map<String, Object> body = Map.of("model", model, "max_tokens", maxTokens, "system", system, "messages", msgs);
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
        Map<String, Object> usage = (Map<String, Object>) resp.get("usage");
        return new Completion(text == null ? null : text.toString(), model,
                num(usage, "input_tokens"), num(usage, "output_tokens"), 0);
    }

    /** OpenRouter (OpenAI-compatible): POST /api/v1/chat/completions with a Bearer token. */
    @SuppressWarnings("unchecked")
    private Completion openRouter(String model, String system, List<Message> messages, int maxTokens) {
        return openRouter(model, system, messages, maxTokens, props.thinking());
    }

    /**
     * @param thinking send the configured reasoning budget on top of the answer cap; false sends reasoning off with the
     *                 plain cap (the retry path when a model spent everything on hidden thinking anyway)
     */
    private Completion openRouter(String model, String system, List<Message> messages, int maxTokens, boolean thinking) {
        List<Map<String, String>> msgs = new ArrayList<>();
        msgs.add(Map.of("role", "system", "content", system));
        for (Message m : messages) msgs.add(Map.of("role", m.role(), "content", m.content()));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("max_tokens", thinking ? props.budget(maxTokens) : maxTokens);
        body.put("messages", msgs);
        body.put("reasoning", thinking ? props.reasoningParam() : Map.of("enabled", false));
        Map<String, Object> resp = client.post()
                .uri("/api/v1/chat/completions")
                .header("Authorization", "Bearer " + props.apiKey())
                .header("X-Title", "cosmictriad.com")
                .header("content-type", "application/json")
                .body(body)
                .retrieve()
                .body(Map.class);
        if (resp == null) return null;
        List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.get("choices");
        if (choices == null || choices.isEmpty()) return null;
        Map<String, Object> choice = choices.get(0);
        Map<String, Object> message = (Map<String, Object>) choice.get("message");
        Map<String, Object> usage = (Map<String, Object>) resp.get("usage");
        if (message == null) return null;
        Object content = message.get("content");
        if (content == null || content.toString().isBlank()) {
            log.warn("OpenRouter ({}) returned empty content: finish_reason={}, usage={}", model, choice.get("finish_reason"), usage);
            // A thinking model sometimes stops inside its reasoning (finish_reason=stop) or runs out of budget there
            // (finish_reason=length); either way nothing visible came back, so ask once more without thinking.
            if (thinking && reasoningTokens(usage) > 0) {
                log.warn("OpenRouter ({}) answered only in hidden reasoning ({} tokens, finish_reason={}, max_tokens={}); "
                        + "retrying once without thinking", model, reasoningTokens(usage), choice.get("finish_reason"), props.budget(maxTokens));
                return openRouter(model, system, messages, maxTokens, false);
            }
            return null;
        }
        if ("length".equals(choice.get("finish_reason"))) {
            log.warn("OpenRouter ({}) hit max_tokens={} (reasoning {} tokens), answer may be truncated", model,
                    thinking ? props.budget(maxTokens) : maxTokens, reasoningTokens(usage));
        }
        return new Completion(content.toString(), model, num(usage, "prompt_tokens"), num(usage, "completion_tokens"), 0);
    }

    @SuppressWarnings("unchecked")
    private static int reasoningTokens(Map<String, Object> usage) {
        if (usage == null) return 0;
        Object details = usage.get("completion_tokens_details");
        return details instanceof Map<?, ?> d ? num((Map<String, Object>) d, "reasoning_tokens") : 0;
    }

    private static int num(Map<String, Object> m, String key) {
        if (m == null) return 0;
        Object v = m.get(key);
        return v instanceof Number n ? n.intValue() : 0;
    }
}
