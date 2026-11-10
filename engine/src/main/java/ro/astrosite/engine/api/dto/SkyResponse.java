package ro.astrosite.engine.api.dto;

import ro.astrosite.engine.astro.Angles;
import ro.astrosite.engine.astro.NatalChart;
import ro.astrosite.engine.astro.Planet;
import ro.astrosite.engine.astro.Transits;
import ro.astrosite.engine.astro.ZodiacSign;
import ro.astrosite.engine.scoring.ScoringRules;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Everything the browser needs to draw the day's sky over a natal chart: both sets of positions, the natal
 * angles and house cusps (empty when the birth time is unknown) and the transit-to-natal aspects the
 * narration talks about. Houses on both lists are the natal whole-sign houses.
 *
 * @param nature of an aspect: +1 harmonious (trine, sextile), -1 challenging (square, opposition), 0 conjunction
 */
public record SkyResponse(LocalDate date, boolean timeKnown, Double ascendant, Double midheaven, List<Double> houseCusps,
                          String moonPhase, List<ChartResponse.Position> natal, List<ChartResponse.Position> transit,
                          List<TransitAspectDto> aspects) {

    public record TransitAspectDto(String transit, String natal, String aspect, double orb, int nature) {}

    public static SkyResponse of(NatalChart natal, NatalChart transit, LocalDate date) {
        String phase = ScoringRules.phaseName(
                Angles.norm360(transit.positions().get(Planet.MOON) - transit.positions().get(Planet.SUN)));
        List<TransitAspectDto> aspects = Transits.aspects(natal, transit).stream()
                .map(a -> new TransitAspectDto(a.transit().name(), a.natal().name(), a.aspect().name(), round(a.orb()),
                        (int) Math.signum(a.aspect().nature())))
                .toList();
        return new SkyResponse(date, natal.birth().timeKnown(),
                natal.ascendant() == null ? null : round(natal.ascendant()),
                natal.midheaven() == null ? null : round(natal.midheaven()),
                natal.houseCusps().stream().map(SkyResponse::round).toList(),
                phase, positions(natal, natal), positions(transit, natal), aspects);
    }

    private static List<ChartResponse.Position> positions(NatalChart chart, NatalChart houses) {
        List<ChartResponse.Position> out = new ArrayList<>();
        for (Planet p : Planet.values()) {
            double lon = chart.positions().get(p);
            out.add(new ChartResponse.Position(p.name(), round(lon), ZodiacSign.of(lon).name(),
                    round(ZodiacSign.degreeInSign(lon)), chart.retrograde().get(p), houses.houseOf(lon)));
        }
        return out;
    }

    private static double round(double v) { return Math.round(v * 100.0) / 100.0; }
}
