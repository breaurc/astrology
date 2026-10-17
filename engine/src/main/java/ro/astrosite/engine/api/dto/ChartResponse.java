package ro.astrosite.engine.api.dto;

import ro.astrosite.engine.astro.NatalChart;
import ro.astrosite.engine.astro.Planet;
import ro.astrosite.engine.astro.ZodiacSign;

import java.util.ArrayList;
import java.util.List;

public record ChartResponse(boolean timeKnown, String sunSign, String moonSign, String risingSign,
                            List<Position> positions, List<AspectDto> aspects, List<Double> houseCusps,
                            Double ascendant, Double midheaven) {

    public record Position(String body, double longitude, String sign, double degree, boolean retrograde, int house) {}
    public record AspectDto(String a, String b, String aspect, double orb) {}

    public static ChartResponse from(NatalChart c) {
        List<Position> positions = new ArrayList<>();
        for (Planet p : Planet.values()) {
            double lon = c.positions().get(p);
            positions.add(new Position(p.name(), round(lon), ZodiacSign.of(lon).name(),
                    round(ZodiacSign.degreeInSign(lon)), c.retrograde().get(p), c.houseOf(lon)));
        }
        List<AspectDto> aspects = c.aspects().stream()
                .map(a -> new AspectDto(a.a().name(), a.b().name(), a.aspect().name(), a.orb())).toList();
        return new ChartResponse(c.birth().timeKnown(), c.sunSign().name(), c.moonSign().name(),
                c.risingSign() == null ? null : c.risingSign().name(),
                positions, aspects, c.houseCusps().stream().map(ChartResponse::round).toList(),
                c.ascendant() == null ? null : round(c.ascendant()),
                c.midheaven() == null ? null : round(c.midheaven()));
    }

    private static double round(double v) { return Math.round(v * 100.0) / 100.0; }
}
