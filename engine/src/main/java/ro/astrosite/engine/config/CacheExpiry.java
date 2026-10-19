package ro.astrosite.engine.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * The in-memory caches ("dayScores", "askAnswers") are keyed by birth data and question text.
 * Clearing them every hour keeps that personal data out of memory (GDPR storage limitation) and bounds memory use.
 * Interval: astro.cache.clear-ms (default one hour).
 */
@Configuration
@EnableScheduling
public class CacheExpiry {

    private static final Logger log = LoggerFactory.getLogger(CacheExpiry.class);

    private final CacheManager cacheManager;

    public CacheExpiry(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    @Scheduled(fixedRateString = "${astro.cache.clear-ms:3600000}", initialDelayString = "${astro.cache.clear-ms:3600000}")
    public void clearAll() {
        for (String name : cacheManager.getCacheNames()) {
            Cache cache = cacheManager.getCache(name);
            if (cache != null) cache.clear();
        }
        log.debug("Cleared caches {}", cacheManager.getCacheNames());
    }
}
