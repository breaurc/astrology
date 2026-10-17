package ro.astrosite.engine.ask;

import org.springframework.stereotype.Component;
import ro.astrosite.engine.scoring.Category;
import ro.astrosite.engine.scoring.DayScores;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/** Free, deterministic narrator built from localized templates. Always available. */
@Component
public class TemplateNarrator implements Narrator {

    private final FactorTexts texts;

    public TemplateNarrator(FactorTexts texts) {
        this.texts = texts;
    }

    @Override
    public String name() { return "template"; }

    @Override
    public String narrate(String question, Category category, int score, DayScores.Verdict verdict,
                          List<AskAnswer.Reason> reasons, Locale locale) {
        String cat = texts.label(category.name(), locale);
        String opening = texts.message("narrative." + verdict.name().toLowerCase(), locale, cat, score);

        List<AskAnswer.Reason> pros = reasons.stream().filter(r -> r.weight() > 0).limit(3).toList();
        List<AskAnswer.Reason> cons = reasons.stream().filter(r -> r.weight() < 0).limit(2).toList();

        StringBuilder sb = new StringBuilder(opening);
        if (!pros.isEmpty()) {
            sb.append(' ').append(texts.message("narrative.pros", locale, join(pros)));
        }
        if (!cons.isEmpty()) {
            sb.append(' ').append(texts.message("narrative.cons", locale, join(cons)));
        }
        sb.append(' ').append(texts.message("narrative.advice." + verdict.name().toLowerCase(), locale));
        return sb.toString();
    }

    private static String join(List<AskAnswer.Reason> rs) {
        return rs.stream().map(r -> lowerFirst(r.text())).collect(Collectors.joining("; "));
    }

    private static String lowerFirst(String s) {
        return s.isEmpty() ? s : Character.toLowerCase(s.charAt(0)) + s.substring(1);
    }
}
