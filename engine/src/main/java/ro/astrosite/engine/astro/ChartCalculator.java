package ro.astrosite.engine.astro;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import static ro.astrosite.engine.astro.Angles.*;

/** Builds a chart from birth data. Pure computation, no framework dependency. */
public final class ChartCalculator {

    public NatalChart compute(BirthData birth) {
        double jd = birth.julianDay();
        Map<Planet, Double> positions = new EnumMap<>(Planet.class);
        Map<Planet, Boolean> retro = new EnumMap<>(Planet.class);
        for (Planet p : Planet.values()) {
            positions.put(p, Ephemeris.longitude(p, jd));
            retro.put(p, Ephemeris.isRetrograde(p, jd));
        }

        Double asc = null, mc = null;
        List<Double> cusps = new ArrayList<>();
        if (birth.timeKnown()) {
            double[] angles = angles(jd, birth.latitude(), birth.longitude());
            asc = angles[0];
            mc = angles[1];
            double first = Math.floor(asc / 30.0) * 30.0;     // whole-sign houses
            for (int i = 0; i < 12; i++) cusps.add(norm360(first + 30.0 * i));
        }

        return new NatalChart(birth, jd, positions, retro, asc, mc, cusps, aspects(positions));
    }

    /** Returns {ascendant, midheaven} longitudes of date. */
    public static double[] angles(double jd, double latitude, double longitude) {
        double ramc = rad(Ephemeris.lst(jd, longitude));
        double eps = rad(Ephemeris.obliquity(jd));
        double phi = rad(latitude);

        double mc = norm360(deg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps))));
        double asc = norm360(deg(Math.atan2(Math.cos(ramc),
                -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)))));
        // the Ascendant is always in the half-circle following the MC
        double d = norm360(asc - mc);
        if (d > 180) asc = norm360(asc + 180);
        return new double[]{asc, mc};
    }

    public static List<NatalChart.ChartAspect> aspects(Map<Planet, Double> positions) {
        List<NatalChart.ChartAspect> out = new ArrayList<>();
        Planet[] ps = Planet.values();
        for (int i = 0; i < ps.length; i++) {
            for (int j = i + 1; j < ps.length; j++) {
                double l1 = positions.get(ps[i]), l2 = positions.get(ps[j]);
                for (Aspect a : Aspect.values()) {
                    double orb = a.orbOf(l1, l2);
                    double allowed = a.natalOrb() + (ps[i].isLuminary() || ps[j].isLuminary() ? 2 : 0);
                    if (orb <= allowed) {
                        out.add(new NatalChart.ChartAspect(ps[i], ps[j], a, round2(orb)));
                        break;
                    }
                }
            }
        }
        return out;
    }

    static double round2(double v) { return Math.round(v * 100.0) / 100.0; }
}
