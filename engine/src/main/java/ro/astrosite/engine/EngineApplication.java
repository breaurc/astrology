package ro.astrosite.engine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;
import ro.astrosite.engine.config.LlmProperties;

@SpringBootApplication
@EnableCaching
@EnableConfigurationProperties(LlmProperties.class)
public class EngineApplication {
    public static void main(String[] args) {
        SpringApplication.run(EngineApplication.class, args);
    }
}
