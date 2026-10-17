package ro.astrosite.engine.ask;

import org.junit.jupiter.api.Test;
import ro.astrosite.engine.scoring.Category;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ClassifierAndGuardrailsTest {

    @Test
    void classifiesRomanianAndEnglish() {
        assertEquals(Category.LOVE, QuestionClassifier.classify("Is it a good day to meet a new person?"));
        assertEquals(Category.LOVE, QuestionClassifier.classify("E o zi bună să cunosc o persoană nouă?"));
        assertEquals(Category.CAREER, QuestionClassifier.classify("Should I go to the job interview today?"));
        assertEquals(Category.TRAVEL, QuestionClassifier.classify("Plec în călătorie mâine, e bine?"));
        assertEquals(Category.MONEY, QuestionClassifier.classify("Pot să cumpăr o mașină azi?"));
        assertEquals(Category.GENERAL, QuestionClassifier.classify("Cum e ziua de azi?"));
    }

    @Test
    void guardrailsFlagSensitiveQuestions() {
        assertEquals(Guardrails.Flag.DISTRESS, Guardrails.check("I don't want to live anymore"));
        assertEquals(Guardrails.Flag.MEDICAL, Guardrails.check("Should I stop my medication today?"));
        assertEquals(Guardrails.Flag.LEGAL, Guardrails.check("E bine să depun plângere azi?"));
        assertEquals(Guardrails.Flag.INVESTMENT, Guardrails.check("Should I buy bitcoin today?"));
        assertEquals(Guardrails.Flag.NONE, Guardrails.check("Is it a good day to meet a new person?"));
    }
}
