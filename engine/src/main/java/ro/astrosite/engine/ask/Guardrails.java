package ro.astrosite.engine.ask;

import java.util.List;

/**
 * Detects questions the site must not answer with an astrological verdict, and requests that are
 * clearly not about the person's chart or day (answered with a fixed reply, no LLM call, SPEC section 7).
 * Matching is done on the normalized (lower-case, no diacritics) question.
 */
public final class Guardrails {

    public enum Flag { NONE, DISTRESS, MEDICAL, LEGAL, INVESTMENT, OFF_TOPIC }

    /**
     * Joins the fixed guardrail sentence and the model's text. When the model echoed the sentence (or its second
     * half, the "about the timing:" part) at the start of its reply, that echo is dropped so it reads once.
     */
    public static String prefixed(String prefix, String text) {
        String body = text == null ? "" : text.strip();
        String[] parts = prefix.split("(?<=[.!?:])\\s+");
        for (int i = 0; i < parts.length; i++) {
            String tail = String.join(" ", java.util.Arrays.copyOfRange(parts, i, parts.length)).strip();
            if (tail.isEmpty()) continue;
            if (body.regionMatches(true, 0, tail, 0, tail.length())) {
                body = body.substring(tail.length()).strip();
                break;
            }
        }
        return body.isEmpty() ? prefix : prefix + " " + body;
    }

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
    /** Obvious non-astrology tasks: the engine answers only about the chart and the day. */
    private static final List<String> OFF_TOPIC = List.of(
            "write code", "scrie cod", "scrie un cod", " python", "javascript", "typescript", " java ", " sql",
            " html", " css ", "recipe", "reteta", "retete", "translate", "traduce", "tradu ", "traducere", " poem",
            "poezie", "essay", "eseu", "homework", "tema de casa", "temele", "weather forecast", "cum e vremea",
            "capital of", "capitala ", "summarize", "rezuma", "summary of", "news today", "stirile", "football",
            "fotbal", "solve this", "rezolva ecuatia", "calculate", "calculeaza", "write an email", "scrie un email",
            "cover letter", "scrisoare de intentie");

    public static Flag check(String question) {
        String q = QuestionClassifier.normalize(question);
        if (containsAny(q, DISTRESS)) return Flag.DISTRESS;
        if (containsAny(q, MEDICAL)) return Flag.MEDICAL;
        if (containsAny(q, LEGAL)) return Flag.LEGAL;
        if (containsAny(q, INVESTMENT)) return Flag.INVESTMENT;
        if (containsAny(q, OFF_TOPIC)) return Flag.OFF_TOPIC;
        return Flag.NONE;
    }

    private static boolean containsAny(String q, List<String> words) {
        for (String w : words) if (q.contains(w)) return true;
        return false;
    }
}
