package ro.astrosite.engine.ask;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;

/** The model is told about the fixed guardrail sentence so it does not open with a second disclaimer. */
@SpringBootTest(properties = "astro.llm.api-key=")
class GuardrailNoteTest {

    @Autowired
    FactorTexts texts;

    @Test
    void noteQuotesTheFixedSentenceForTheThreePrefixedFlags() {
        String en = NarrationService.guardrailNote(texts, Guardrails.Flag.INVESTMENT, Locale.ENGLISH);
        assertTrue(en.contains("declines financial advice"), en);
        assertFalse(en.contains("We do not give"), "the sentence is described, not quoted, or the model echoes it: " + en);
        String ro = NarrationService.guardrailNote(texts, Guardrails.Flag.MEDICAL, Locale.forLanguageTag("ro"));
        assertTrue(ro.contains("sfaturile medicale"), ro);
        assertTrue(ro.contains("fără repetarea"), ro);
        assertNotNull(NarrationService.guardrailNote(texts, Guardrails.Flag.LEGAL, Locale.ENGLISH));
    }

    @Test
    void echoedPrefixIsDroppedSoTheSentenceReadsOnce() {
        String p = "For legal matters, a lawyer is the right adviser. Astrologically speaking, about the timing:";
        assertEquals(p + " the sky is mixed.", Guardrails.prefixed(p, "the sky is mixed."));
        assertEquals(p + " the sky is mixed.", Guardrails.prefixed(p, p + " the sky is mixed."));
        assertEquals(p + " the sky is mixed.", Guardrails.prefixed(p, "Astrologically speaking, about the timing: the sky is mixed."));
        assertEquals(p + " The sky is mixed.", Guardrails.prefixed(p, "for legal matters, a lawyer is the right adviser. astrologically speaking, about the timing:  The sky is mixed."));
        assertEquals(p, Guardrails.prefixed(p, p));
        assertEquals(p, Guardrails.prefixed(p, null));
    }

    @Test
    void noNoteWhenNothingIsPrefixed() {
        assertNull(NarrationService.guardrailNote(texts, Guardrails.Flag.NONE, Locale.ENGLISH));
        assertNull(NarrationService.guardrailNote(texts, Guardrails.Flag.DISTRESS, Locale.ENGLISH));
        assertNull(NarrationService.guardrailNote(texts, Guardrails.Flag.OFF_TOPIC, Locale.ENGLISH));
    }
}
