package ro.astrosite.engine.ask;

import java.util.List;

/**
 * Detects questions the site must not answer with an astrological verdict.
 * Matching is done on the normalized (lower-case, no diacritics) question.
 */
public final class Guardrails {

    public enum Flag { NONE, DISTRESS, MEDICAL, LEGAL, INVESTMENT }

    private static final List<String> DISTRESS = List.of(
            "sinucid", "suicid", "sa mor", "vreau sa mor", "nu mai vreau sa traiesc", "sa ma omor", "imi fac rau",
            "sa ma ranesc", "kill myself", "suicide", "want to die", "end my life", "hurt myself", "self harm",
            "self-harm", "no reason to live", "nu mai am rost", "want to live", "to live anymore", "end it all",
            "sa nu mai traiesc", "nu vreau sa traiesc", "nu mai pot trai", "nu mai are rost");
    private static final List<String> MEDICAL = List.of(
            "medicament", "pastil", "tratament", "diagnostic", "boala", "bolnav", "cancer", "operatie", "chirurg",
            "sarcin", "avort", "doctor", "medic ", "spital", "simptom", "medication", "pill", "treatment", "diagnos",
            "disease", "sick", "surgery", "pregnan", "abortion", "hospital", "symptom", "therapy", "terapie",
            "vaccin", "chemo", "tumor", "tumoare");
    private static final List<String> LEGAL = List.of(
            "proces", "tribunal", "avocat", "judecat", "divort", "custodie", "plangere", "politie", "arest",
            "lawsuit", "court", "lawyer", "attorney", "judge", "divorce", "custody", "police", "arrest", "sue ",
            "legal", "notar", "mostenire", "inheritance", "testament");
    private static final List<String> INVESTMENT = List.of(
            "crypto", "bitcoin", "actiuni", "bursa", "stocks", "stock market", "trading", "forex", "etf",
            "investesc", "invest ", "investment", "pariu", "pariez", "bet ", "betting", "loto", "lottery", "casino",
            "jocuri de noroc", "gambling");

    public static Flag check(String question) {
        String q = QuestionClassifier.normalize(question);
        if (containsAny(q, DISTRESS)) return Flag.DISTRESS;
        if (containsAny(q, MEDICAL)) return Flag.MEDICAL;
        if (containsAny(q, LEGAL)) return Flag.LEGAL;
        if (containsAny(q, INVESTMENT)) return Flag.INVESTMENT;
        return Flag.NONE;
    }

    private static boolean containsAny(String q, List<String> words) {
        for (String w : words) if (q.contains(w)) return true;
        return false;
    }
}
