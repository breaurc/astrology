package ro.astrosite.engine.ask;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Versioned system prompts, one file per mode and language: resources/prompts/{mode}.{lang}.txt.
 * Falls back to English when a language file is missing. Loaded once and cached.
 */
@Component
public class Prompts {

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public String system(NarrationService.Mode mode, Locale locale) {
        String lang = "ro".equals(locale.getLanguage()) ? "ro" : "en";
        String key = mode.name().toLowerCase() + "." + lang;
        return cache.computeIfAbsent(key, k -> load(k)
                .or(() -> load(mode.name().toLowerCase() + ".en"))
                .orElseThrow(() -> new IllegalStateException("missing prompt file prompts/" + k + ".txt")));
    }

    private static Optional<String> load(String key) {
        ClassPathResource r = new ClassPathResource("prompts/" + key + ".txt");
        if (!r.exists()) return Optional.empty();
        try {
            return Optional.of(new String(r.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim());
        } catch (IOException e) {
            throw new IllegalStateException("cannot read prompt " + key, e);
        }
    }
}
