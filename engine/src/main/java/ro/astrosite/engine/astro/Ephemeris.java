package ro.astrosite.engine.astro;

import static ro.astrosite.engine.astro.Angles.*;

/**
 * Self-contained ephemeris, accurate enough for sign/house placement and aspects
 * (Sun ~0.01°, Moon ~0.1°, planets ~0.1–0.5° in 1800–2050).
 *
 * Sun and Moon follow Meeus, "Astronomical Algorithms" (ch. 25 and 47).
 * Planets use the JPL approximate Keplerian elements (Standish, 1992).
 *
 * This is deliberately dependency-free. Swap in Swiss Ephemeris behind the same
 * interface when arc-second precision (progressions, exact ingress times) is needed.
 */
public final class Ephemeris {

    private Ephemeris() {}

    /** Geocentric apparent ecliptic longitude of date, 0..360. */
    public static double longitude(Planet p, double jd) {
        return switch (p) {
            case SUN -> sunLongitude(jd);
            case MOON -> moonLongitude(jd);
            default -> planetLongitude(p, jd);
        };
    }

    /** Daily motion in degrees; negative means retrograde. */
    public static double dailyMotion(Planet p, double jd) {
        return diff(longitude(p, jd + 0.5), longitude(p, jd - 0.5));
    }

    public static boolean isRetrograde(Planet p, double jd) {
        return !p.isLuminary() && dailyMotion(p, jd) < 0;
    }

    // ---------------------------------------------------------------- Sun

    public static double sunLongitude(double jd) {
        double t = JulianDay.centuries(jd);
        double l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
        double m = rad(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
        double c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m)
                + (0.019993 - 0.000101 * t) * Math.sin(2 * m)
                + 0.000289 * Math.sin(3 * m);
        double trueLong = l0 + c;
        double omega = rad(125.04 - 1934.136 * t);
        return norm360(trueLong - 0.00569 - 0.00478 * Math.sin(omega));
    }

    /** True obliquity of the ecliptic, degrees. */
    public static double obliquity(double jd) {
        double t = JulianDay.centuries(jd);
        double eps0 = 23.0 + (26.0 + (21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813))) / 60.0) / 60.0;
        double omega = rad(125.04 - 1934.136 * t);
        return eps0 + 0.00256 * Math.cos(omega);
    }

    // ---------------------------------------------------------------- Moon

    // D, M, M', F, coefficient (1e-6 deg) — Meeus table 47.A, longitude terms
    private static final int[][] MOON_L = {
            {0, 0, 1, 0, 6288774}, {2, 0, -1, 0, 1274027}, {2, 0, 0, 0, 658314}, {0, 0, 2, 0, 213618},
            {0, 1, 0, 0, -185116}, {0, 0, 0, 2, -114332}, {2, 0, -2, 0, 58793}, {2, -1, -1, 0, 57066},
            {2, 0, 1, 0, 53322}, {2, -1, 0, 0, 45758}, {0, 1, -1, 0, -40923}, {1, 0, 0, 0, -34720},
            {0, 1, 1, 0, -30383}, {2, 0, 0, -2, 15327}, {0, 0, 1, 2, -12528}, {0, 0, 1, -2, 10980},
            {4, 0, -1, 0, 10675}, {0, 0, 3, 0, 10034}, {4, 0, -2, 0, 8548}, {2, 1, -1, 0, -7888},
            {2, 1, 0, 0, -6766}, {1, 0, -1, 0, -5163}, {1, 1, 0, 0, 4987}, {2, -1, 1, 0, 4036},
            {2, 0, 2, 0, 3994}, {4, 0, 0, 0, 3861}, {2, 0, -3, 0, 3665}, {0, 1, -2, 0, -2689},
            {2, 0, -1, 2, -2602}, {2, -1, -2, 0, 2390}, {1, 0, 1, 0, -2348}, {2, -2, 0, 0, 2236},
            {0, 1, 2, 0, -2120}, {0, 2, 0, 0, -2069}, {2, -2, -1, 0, 2048}, {2, 0, 1, -2, -1773},
            {2, 0, 0, 2, -1595}, {4, -1, -1, 0, 1215}, {0, 0, 2, 2, -1110}, {3, 0, -1, 0, -892},
            {2, 1, 1, 0, -810}, {4, -1, -2, 0, 759}, {0, 2, -1, 0, -713}, {2, 2, -1, 0, -700},
            {2, 1, -2, 0, 691}, {2, -1, 0, -2, 596}, {4, 0, 1, 0, 549}, {0, 0, 4, 0, 537},
            {4, -1, 0, 0, 520}, {1, 0, -2, 0, -487}, {2, 1, 0, -2, -399}, {0, 0, 2, -2, -381},
            {1, 1, 1, 0, 351}, {3, 0, -2, 0, -340}, {4, 0, -3, 0, 330}, {2, -1, 2, 0, 327},
            {0, 2, 1, 0, -323}, {1, 1, -1, 0, 299}, {2, 0, 3, 0, 294}
    };

    public static double moonLongitude(double jd) {
        double t = JulianDay.centuries(jd);
        double t2 = t * t, t3 = t2 * t, t4 = t3 * t;
        double lp = norm360(218.3164477 + 481267.88123421 * t - 0.0015786 * t2 + t3 / 538841.0 - t4 / 65194000.0);
        double d = rad(norm360(297.8501921 + 445267.1114034 * t - 0.0018819 * t2 + t3 / 545868.0 - t4 / 113065000.0));
        double m = rad(norm360(357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000.0));
        double mp = rad(norm360(134.9633964 + 477198.8675055 * t + 0.0087414 * t2 + t3 / 69699.0 - t4 / 14712000.0));
        double f = rad(norm360(93.2720950 + 483202.0175233 * t - 0.0036539 * t2 - t3 / 3526000.0 + t4 / 863310000.0));
        double e = 1 - 0.002516 * t - 0.0000074 * t2;

        double sum = 0;
        for (int[] term : MOON_L) {
            double arg = term[0] * d + term[1] * m + term[2] * mp + term[3] * f;
            double coef = term[4];
            int absM = Math.abs(term[1]);
            if (absM == 1) coef *= e;
            else if (absM == 2) coef *= e * e;
            sum += coef * Math.sin(arg);
        }
        double a1 = rad(119.75 + 131.849 * t);
        double a2 = rad(53.09 + 479264.290 * t);
        sum += 3958 * Math.sin(a1) + 1962 * Math.sin(rad(lp) - f) + 318 * Math.sin(a2);

        // nutation in longitude (dominant term) so Moon and Sun are both "apparent"
        double omega = rad(125.04452 - 1934.136261 * t);
        double nutation = -0.00478 * Math.sin(omega);
        return norm360(lp + sum / 1_000_000.0 + nutation);
    }

    // ------------------------------------------------------------- Planets

    /** a, e, I, L, longPeri, longNode + rates per century (JPL approximate elements, 1800–2050). */
    private static final double[][] ELEMENTS = {
            // Mercury
            {0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593,
                    0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081},
            // Venus
            {0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255,
                    0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418},
            // Earth-Moon barycenter
            {1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0,
                    0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0},
            // Mars
            {1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
                    0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343},
            // Jupiter
            {5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909,
                    -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106},
            // Saturn
            {9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448,
                    -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794},
            // Uranus
            {19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503,
                    -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589},
            // Neptune
            {30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574,
                    0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664},
            // Pluto
            {39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684,
                    -0.00031596, 0.00005170, 0.00004818, 145.20780515, -0.04062942, -0.01183482}
    };

    private static int elementIndex(Planet p) {
        return switch (p) {
            case MERCURY -> 0; case VENUS -> 1; case MARS -> 3; case JUPITER -> 4;
            case SATURN -> 5; case URANUS -> 6; case NEPTUNE -> 7; case PLUTO -> 8;
            default -> throw new IllegalArgumentException("Not a planet: " + p);
        };
    }

    /** Heliocentric ecliptic J2000 rectangular coordinates (AU). */
    private static double[] heliocentric(int idx, double t) {
        double[] el = ELEMENTS[idx];
        double a = el[0] + el[6] * t;
        double e = el[1] + el[7] * t;
        double inc = rad(el[2] + el[8] * t);
        double l = el[3] + el[9] * t;
        double lp = el[4] + el[10] * t;
        double node = rad(el[5] + el[11] * t);

        double omega = rad(lp) - node;            // argument of perihelion
        double m = rad(norm360(l - lp));          // mean anomaly
        double ea = m;                            // eccentric anomaly, Newton iteration
        for (int i = 0; i < 30; i++) {
            double delta = (ea - e * Math.sin(ea) - m) / (1 - e * Math.cos(ea));
            ea -= delta;
            if (Math.abs(delta) < 1e-12) break;
        }
        double xp = a * (Math.cos(ea) - e);
        double yp = a * Math.sqrt(1 - e * e) * Math.sin(ea);

        double cw = Math.cos(omega), sw = Math.sin(omega);
        double cn = Math.cos(node), sn = Math.sin(node);
        double ci = Math.cos(inc), si = Math.sin(inc);
        double x = (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp;
        double y = (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp;
        double z = (sw * si) * xp + (cw * si) * yp;
        return new double[]{x, y, z};
    }

    public static double planetLongitude(Planet p, double jd) {
        double t = JulianDay.centuries(jd);
        double[] body = heliocentric(elementIndex(p), t);
        double[] earth = heliocentric(2, t);
        double gx = body[0] - earth[0];
        double gy = body[1] - earth[1];
        double lonJ2000 = deg(Math.atan2(gy, gx));
        double precession = 1.396971 * t + 0.000309 * t * t; // general precession in longitude
        return norm360(lonJ2000 + precession);
    }

    // ------------------------------------------------------- Sidereal time

    /** Greenwich mean sidereal time in degrees. */
    public static double gmst(double jd) {
        double t = JulianDay.centuries(jd);
        return norm360(280.46061837 + 360.98564736629 * (jd - JulianDay.J2000)
                + 0.000387933 * t * t - t * t * t / 38710000.0);
    }

    /** Local sidereal time in degrees, east longitude positive. */
    public static double lst(double jd, double longitudeEast) {
        return norm360(gmst(jd) + longitudeEast);
    }
}
