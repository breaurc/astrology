package ro.astrosite.engine.chinese;

import ro.astrosite.engine.scoring.Category;

import java.util.List;
import java.util.Set;

/**
 * Tong Shu / Huang Li almanac data for one day.
 *
 * @param dayAnimal         animal of the day
 * @param dayBranch         earthly branch of the day
 * @param suitable          activities the almanac marks as favorable (Chinese terms)
 * @param avoid             activities the almanac marks as unfavorable (Chinese terms)
 * @param favorable         categories that appear in the "suitable" list
 * @param unfavorable       categories that appear in the "avoid" list
 * @param auspiciousDay     true when the day's "Tian Shen" is of the auspicious (Huang Dao) kind
 * @param relationToNatal   CLASH, HARM, HARMONY, TRINE or NEUTRAL between the day branch and the natal year branch
 */
public record DayAlmanac(String dayAnimal, String dayBranch,
                         List<String> suitable, List<String> avoid,
                         Set<Category> favorable, Set<Category> unfavorable,
                         boolean auspiciousDay, BranchRelation relationToNatal) {

    public enum BranchRelation { CLASH, HARM, HARMONY, TRINE, NEUTRAL }
}
