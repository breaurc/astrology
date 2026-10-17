package ro.astrosite.engine.ask;

import ro.astrosite.engine.scoring.Category;

import java.text.Normalizer;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Keyword classifier (Romanian + English) mapping a free-text question to a category.
 * Deterministic and free; an LLM classifier can be layered on top for edge cases.
 */
public final class QuestionClassifier {

    private static final Map<Category, List<String>> KEYWORDS = new EnumMap<>(Category.class);

    static {
        KEYWORDS.put(Category.LOVE, List.of(
                "iubire", "dragoste", "relatie", "relatii", "partener", "intalnire", "intalnesc", "cunosc", "cunoaste",
                "persoana noua", "oameni noi", "flirt", "sot", "sotie", "iubit", "iubita", "casator", "nunta", "prieten",
                "social", "petrecere", "date", "dating", "love", "relationship", "partner", "meet", "meeting someone",
                "new person", "new people", "romance", "romantic", "marriage", "wedding", "boyfriend", "girlfriend",
                "husband", "wife", "friend", "party", "crush", "propose", "propunere"));
        KEYWORDS.put(Category.CAREER, List.of(
                "job", "serviciu", "munca", "cariera", "interviu", "angaj", "sef", "promovare", "proiect", "afacere",
                "business", "lansez", "lansare", "negociere", "negociez", "demisie", "firma", "client", "contract",
                "career", "work", "interview", "boss", "promotion", "project", "launch", "negotiat", "resign", "startup",
                "company", "meeting", "sedinta", "prezentare", "presentation", "exam", "examen", "test"));
        KEYWORDS.put(Category.MONEY, List.of(
                "bani", "cumpar", "cumparatura", "vanzare", "vand", "imprumut", "credit", "investi", "investitie",
                "economii", "salariu", "plata", "pret", "masina", "money", "buy", "purchase", "sell", "loan", "invest",
                "savings", "salary", "pay", "price", "car", "budget", "buget", "financial", "financiar", "shopping"));
        KEYWORDS.put(Category.TRAVEL, List.of(
                "calatorie", "calatoresc", "drum", "plec", "plecare", "zbor", "avion", "vacanta", "excursie", "concediu",
                "tren", "condus", "sofez", "travel", "trip", "flight", "fly", "vacation", "holiday", "journey", "drive",
                "driving", "road", "abroad", "strainatate", "deplasare"));
        KEYWORDS.put(Category.COMMUNICATION, List.of(
                "vorbesc", "discutie", "discut", "conversatie", "mesaj", "email", "scrisoare", "semnez", "semnare",
                "anunt", "public", "postez", "spun", "marturisesc", "cer", "cerere", "talk", "discuss", "conversation",
                "message", "text", "write", "sign", "signing", "announce", "post", "publish", "tell", "confess", "ask",
                "apologize", "scuze", "iert", "clarific", "pitch", "call", "sun", "telefon", "phone"));
        KEYWORDS.put(Category.HOME, List.of(
                "casa", "acasa", "familie", "mutare", "mut", "apartament", "renovare", "renovez", "copil", "copii",
                "parinti", "mama", "tata", "gradina", "chirie", "home", "house", "family", "move", "moving", "apartment",
                "renovat", "renovation", "kids", "children", "parents", "mother", "father", "garden", "rent", "tenant",
                "chirias", "decorat", "mobila", "furniture"));
        KEYWORDS.put(Category.WELLBEING, List.of(
                "odihna", "odihnesc", "relax", "sport", "antrenament", "sala", "alergare", "dieta", "meditatie", "somn",
                "energie", "obosit", "stres", "rest", "workout", "gym", "run", "running", "diet", "meditation", "sleep",
                "energy", "tired", "stress", "spa", "masaj", "massage", "yoga", "detox", "wellness", "frizer", "tuns",
                "haircut", "self-care"));
    }

    public static Category classify(String question) {
        if (question == null || question.isBlank()) return Category.GENERAL;
        String q = normalize(question);
        Category best = Category.GENERAL;
        int bestScore = 0;
        for (Map.Entry<Category, List<String>> e : KEYWORDS.entrySet()) {
            int score = 0;
            for (String k : e.getValue()) {
                if (q.contains(k)) score += k.length() > 5 ? 2 : 1;
            }
            if (score > bestScore) { bestScore = score; best = e.getKey(); }
        }
        return best;
    }

    /** Lower-case, diacritics stripped, so "întâlnire" matches "intalnire". */
    public static String normalize(String s) {
        String n = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return " " + n.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ") + " ";
    }
}
