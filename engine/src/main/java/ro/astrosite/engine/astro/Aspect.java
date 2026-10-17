package ro.astrosite.engine.astro;

public enum Aspect {
    CONJUNCTION(0, 8, 0.0),
    SEXTILE(60, 4, 1.0),
    SQUARE(90, 7, -1.0),
    TRINE(120, 7, 1.0),
    OPPOSITION(180, 8, -1.0);

    private final int angle;
    private final double natalOrb;
    /** +1 harmonious, -1 challenging, 0 neutral (depends on the planets). */
    private final double nature;

    Aspect(int angle, double natalOrb, double nature) {
        this.angle = angle;
        this.natalOrb = natalOrb;
        this.nature = nature;
    }

    public int angle() { return angle; }
    public double natalOrb() { return natalOrb; }
    public double nature() { return nature; }

    /** Returns the aspect formed by two longitudes within the given orb, or null. */
    public static Aspect between(double lon1, double lon2, double orb) {
        double sep = Angles.separation(lon1, lon2);
        Aspect best = null;
        double bestDelta = Double.MAX_VALUE;
        for (Aspect a : values()) {
            double delta = Math.abs(sep - a.angle);
            if (delta <= orb && delta < bestDelta) { best = a; bestDelta = delta; }
        }
        return best;
    }

    /** Exactness of the aspect in degrees (0 = exact). */
    public double orbOf(double lon1, double lon2) {
        return Math.abs(Angles.separation(lon1, lon2) - angle);
    }
}
