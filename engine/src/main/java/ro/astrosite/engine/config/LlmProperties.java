package ro.astrosite.engine.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Optional LLM narration. Set ASTRO_LLM_API_KEY to enable; otherwise templates are used.
 * <p>
 * provider = "anthropic" (default) calls the Anthropic Messages API directly;
 * provider = "openrouter" calls OpenRouter's OpenAI-compatible chat endpoint, so any model
 * OpenRouter lists can be used (e.g. "deepseek/deepseek-v4-flash", "anthropic/claude-haiku-4.5").
 */
@ConfigurationProperties(prefix = "astro.llm")
public record LlmProperties(String provider, String apiKey, String model, String baseUrl) {

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
    }

    public boolean openRouter() { return OPENROUTER.equals(provider); }
}
