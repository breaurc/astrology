package ro.astrosite.engine.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Optional LLM narration. Set ASTRO_LLM_API_KEY to enable; otherwise templates are used.
 * <p>
 * provider = "anthropic" (default) calls the Anthropic Messages API directly;
 * provider = "openrouter" calls OpenRouter's OpenAI-compatible chat endpoint, so any model
 * OpenRouter lists can be used (e.g. "deepseek/deepseek-v4-flash", "anthropic/claude-haiku-4.5").
 *
 * @param fallbackModel      tried when the main model fails (HLD section 6); null = none
 * @param timeoutMs          read timeout per LLM call (HLD section 6: 20 s)
 * @param dailyTokenCeiling  tokens (in + out) per day after which answer/chat return 503 and readings use templates; 0 = unlimited
 * @param maxTokensReading   output cap for the 4-line reading (generous: reasoning models spend hidden tokens first)
 * @param maxTokensAnswer    output cap for the daily question
 * @param maxTokensChat      output cap per conversation turn
 */
@ConfigurationProperties(prefix = "astro.llm")
public record LlmProperties(String provider, String apiKey, String model, String baseUrl, String fallbackModel,
                            Integer timeoutMs, Long dailyTokenCeiling,
                            Integer maxTokensReading, Integer maxTokensAnswer, Integer maxTokensChat) {

    public static final String ANTHROPIC = "anthropic";
    public static final String OPENROUTER = "openrouter";

    public LlmProperties {
        provider = (provider == null || provider.isBlank()) ? ANTHROPIC : provider.trim().toLowerCase();
        if (!provider.equals(ANTHROPIC) && !provider.equals(OPENROUTER)) {
            throw new IllegalArgumentException("astro.llm.provider must be 'anthropic' or 'openrouter', got: " + provider);
        }
        boolean openRouter = provider.equals(OPENROUTER);
        if (model == null || model.isBlank()) model = openRouter ? "deepseek/deepseek-v4-flash" : "claude-haiku-4-5";
        if (baseUrl == null || baseUrl.isBlank()) baseUrl = openRouter ? "https://openrouter.ai" : "https://api.anthropic.com";
        if (fallbackModel != null && fallbackModel.isBlank()) fallbackModel = null;
        if (timeoutMs == null || timeoutMs <= 0) timeoutMs = 20_000;
        if (dailyTokenCeiling == null || dailyTokenCeiling < 0) dailyTokenCeiling = 0L;
        if (maxTokensReading == null || maxTokensReading <= 0) maxTokensReading = 400;
        if (maxTokensAnswer == null || maxTokensAnswer <= 0) maxTokensAnswer = 700;
        if (maxTokensChat == null || maxTokensChat <= 0) maxTokensChat = 900;
    }

    public boolean openRouter() { return OPENROUTER.equals(provider); }

    public boolean enabled() { return apiKey != null && !apiKey.isBlank(); }
}
