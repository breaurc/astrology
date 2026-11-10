package ro.astrosite.engine.astro;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Today's sky against a natal chart. One list of transit-to-natal aspects feeds both the day scores and the
 * chart wheel, so what the narration names is exactly what the drawing shows.
 */
public final class Transits {

    private Transits() {}

    /** @param orb exactness in degrees, 0 = exact */
    public record TransitAspect(Planet transit, Planet natal, Aspect aspect, double orb) {}

    /** The transit snapshot is taken at local noon of the day, at the birth place. */
    public static BirthData noon(BirthData birth, LocalDate date) {
        return new BirthData(null, date, LocalTime.NOON, birth.zone(), birth.latitude(), birth.longitude());
    }

    /** Aspects between transiting and natal planets, within the transiting planet's orb. */
    public static List<TransitAspect> aspects(NatalChart natal, NatalChart transit) {
        List<TransitAspect> out = new ArrayList<>();
        for (Planet t : Planet.values()) {
            double tl = transit.positions().get(t);
            for (Planet n : Planet.values()) {
                double nl = natal.positions().get(n);
                Aspect a = Aspect.between(tl, nl, t.transitOrb());
                if (a != null) out.add(new TransitAspect(t, n, a, a.orbOf(tl, nl)));
            }
        }
        return out;
    }
}
