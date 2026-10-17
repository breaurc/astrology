package ro.astrosite.engine.ask;

import ro.astrosite.engine.scoring.Category;
import ro.astrosite.engine.scoring.DayScores;

import java.util.List;
import java.util.Locale;

/** Turns computed factors into a short narrative answer. Must only use the given reasons. */
public interface Narrator {

    String name();

    /**
     * @return narrative text, or null when this narrator cannot answer (the caller falls back)
     */
    String narrate(String question, Category category, int score, DayScores.Verdict verdict,
                   List<AskAnswer.Reason> reasons, Locale locale);
}
