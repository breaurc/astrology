package ro.astrosite.engine.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Map;
import java.util.Set;

/**
 * Optional LLM narration. Set ASTRO_LLM_API_KEY to enable; otherwise templates are used.
 * <p>
 * provider = "anthropic" (default) calls the Anthropic Messages API directly;
 * provider = "openrouter" calls OpenRouter's OpenAI-compatible chat endpoint, so any model
 * OpenRouter lists can be used (e.g. "deepseek/deepseek-v4-flash", "anthropic/claude-haiku-4.5").
 *
 * @param fallbackModel      tried when the main model fails (HLD section 6); null = none
 * @param timeoutMs          read timeout per LLM call (30 s; HLD section 6 said 20 s before reasoning models)
 * @param dailyTokenCeiling  tokens (in + out) per day after which answer/chat return 503 and readings use templates; 0 = unlimited
 * @param maxTokensReading   output cap for the 4-line reading (generous: reasoning models spend hidden tokens first)
 * @param maxTokensAnswer    output cap for the daily question
 * @param maxTokensChat      output cap per conversation turn
 * @param reasoning          OpenRouter only: "on" (default) lets a reasoning model think with a budget of
 *                           reasoningTokens, "low" / "medium" / "high" ask for that effort, "off" disables thinking.
 * @param reasoningTokens    hidden-thinking budget added on top of each answer cap when reasoning is not off; the
 *                           answer cap stays reserved for visible text so thinking can never starve the reply
 */
@ConfigurationProperties(prefix = "astro.llm")
public record LlmProperties(String provider, String apiKey, String model, String baseUrl, String fallbackModel,
                            Integer timeoutMs, Long dailyTokenCeiling,
                            Integer maxTokensReading, Integer maxTokensAnswer, Integer maxTokensChat,
                            String reasoning, Integer reasoningTokens) {

    public static final String ANTHROPIC = "anthropic";
    public static final String OPENROUTER = "openrouter";
    private static final Set<String> REASONING = Set.of("off", "low", "medium", "high", "on");

    public LlmProperties {
        provider = (provider == null || provider.isBlank()) ? ANTHROPIC : provider.trim().toLowerCase();
        if (!provider.equals(ANTHROPIC) && !provider.equals(OPENROUTER)) {
            throw new IllegalArgumentException("astro.llm.provider must be 'anthropic' or 'openrouter', got: " + provider);
        }
        boolean openRouter = provider.equals(OPENROUTER);
        if (model == null || model.isBlank()) model = openRouter ? "deepseek/deepseek-v4-flash" : "claude-haiku-4-5";
        if (baseUrl == null || baseUrl.isBlank()) baseUrl = openRouter ? "https://openrouter.ai" : "https://api.anthropic.com";
        if (fallbackModel != null && fallbackModel.isBlank()) fallbackModel = null;
        if (timeoutMs == null || timeoutMs <= 0) timeoutMs = 30_000;
        if (dailyTokenCeiling == null || dailyTokenCeiling < 0) dailyTokenCeiling = 0L;
        if (maxTokensReading == null || maxTokensReading <= 0) maxTokensReading = 400;
        if (maxTokensAnswer == null || maxTokensAnswer <= 0) maxTokensAnswer = 700;
        if (maxTokensChat == null || maxTokensChat <= 0) maxTokensChat = 900;
        reasoning = (reasoning == null || reasoning.isBlank()) ? "on" : reasoning.trim().toLowerCase();
        if (!REASONING.contains(reasoning)) {
            throw new IllegalArgumentException("astro.llm.reasoning must be off, low, medium, high or on, got: " + reasoning);
        }
        if (reasoningTokens == null || reasoningTokens < 0) reasoningTokens = 1500;
    }

    public boolean thinking() { return !"off".equals(reasoning); }

    /** OpenRouter's unified "reasoning" request field for the configured setting. */
    public Map<String, Object> reasoningParam() {
        return switch (reasoning) {
            case "off" -> Map.of("enabled", false);
            case "on" -> Map.of("max_tokens", reasoningTokens);
            default -> Map.of("effort", reasoning);
        };
    }

    /** max_tokens to request so that {@code answerCap} visible tokens remain after the thinking budget. */
    public int budget(int answerCap) {
        return thinking() ? answerCap + reasoningTokens : answerCap;
    }

    public boolean openRouter() { return OPENROUTER.equals(provider); }

    public boolean enabled() { return apiKey != null && !apiKey.isBlank(); }
}
