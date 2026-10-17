package ro.astrosite.engine.scoring;

import java.util.Map;
import java.util.Set;

/**
 * One piece of evidence that influences a day score.
 *
 * @param source     WESTERN, CHINESE or NUMEROLOGY
 * @param code       i18n key (factor.<code>) used by narrators
 * @param weight     signed contribution, roughly -1.5 .. +1.5
 * @param params     values for the localized message (planet names, signs, numbers …)
 * @param categories categories this factor applies to
 */
public record Factor(Source source, String code, double weight, Map<String, String> params, Set<Category> categories) {

    public enum Source { WESTERN, CHINESE, NUMEROLOGY }

    public boolean positive() { return weight > 0; }
}
