package ro.astrosite.engine.astro;

import java.util.List;
import java.util.Map;

/**
 * A computed chart (natal or transit snapshot).
 *
 * @param positions   ecliptic longitude per body
 * @param retrograde  retrograde flag per body
 * @param ascendant   longitude of the Ascendant (null when the time is unknown)
 * @param midheaven   longitude of the MC (null when the time is unknown)
 * @param houseCusps  12 cusps, whole-sign system (index 0 = house 1); empty when time unknown
 * @param aspects     aspects between bodies in this chart
 */
public record NatalChart(BirthData birth, double julianDay,
                         Map<Planet, Double> positions, Map<Planet, Boolean> retrograde,
                         Double ascendant, Double midheaven, List<Double> houseCusps,
                         List<ChartAspect> aspects) {

    public record ChartAspect(Planet a, Planet b, Aspect aspect, double orb) {}

    public ZodiacSign sign(Planet p) { return ZodiacSign.of(positions.get(p)); }

    public ZodiacSign sunSign() { return sign(Planet.SUN); }
    public ZodiacSign moonSign() { return sign(Planet.MOON); }
    public ZodiacSign risingSign() { return ascendant == null ? null : ZodiacSign.of(ascendant); }

    /** Whole-sign house (1..12) a longitude falls in, or 0 when houses are unknown. */
    public int houseOf(double longitude) {
        if (ascendant == null) return 0;
        int ascSign = ZodiacSign.of(ascendant).index();
        int sign = ZodiacSign.of(longitude).index();
        return ((sign - ascSign + 12) % 12) + 1;
    }

    /** Longitude of the cusp of a house (1..12), whole-sign; null when unknown. */
    public Double cusp(int house) {
        if (houseCusps.isEmpty()) return null;
        return houseCusps.get(house - 1);
    }
}
