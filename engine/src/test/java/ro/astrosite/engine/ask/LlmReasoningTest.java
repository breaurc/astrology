package ro.astrosite.engine.ask;

import org.junit.jupiter.api.Test;
import ro.astrosite.engine.config.LlmProperties;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * astro.llm.reasoning: a thinking model gets its own budget on top of the answer cap, so hidden reasoning can never
 * use up the tokens reserved for the visible reply.
 */
class LlmReasoningTest {

    private static LlmProperties props(String reasoning, Integer budget) {
        return new LlmProperties("openrouter", "k", null, null, null, null, null, null, null, null, reasoning, budget);
    }

    @Test
    void onByDefaultWithABudgetAddedToTheCap() {
        LlmProperties p = props(null, null);
        assertEquals("on", p.reasoning());
        assertTrue(p.thinking());
        assertEquals(Map.of("max_tokens", 1500), p.reasoningParam());
        assertEquals(900 + 1500, p.budget(900));
        assertEquals(Map.of("max_tokens", 600), props("on", 600).reasoningParam());
    }

    @Test
    void effortLevelsAndOff() {
        assertEquals(Map.of("effort", "low"), props("low", null).reasoningParam());
        assertEquals(Map.of("effort", "high"), props(" High ", null).reasoningParam());
        assertEquals(700 + 1500, props("medium", null).budget(700));
        LlmProperties off = props("off", null);
        assertFalse(off.thinking());
        assertEquals(Map.of("enabled", false), off.reasoningParam());
        assertEquals(400, off.budget(400));
        assertThrows(IllegalArgumentException.class, () -> props("maybe", null));
    }
}
