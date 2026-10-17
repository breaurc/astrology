package ro.astrosite.engine.astro;

public final class Angles {
    private Angles() {}

    public static double norm360(double deg) {
        double d = deg % 360.0;
        return d < 0 ? d + 360.0 : d;
    }

    /** Signed shortest difference a-b in (-180, 180]. */
    public static double diff(double a, double b) {
        double d = norm360(a - b);
        return d > 180.0 ? d - 360.0 : d;
    }

    /** Unsigned angular separation in [0, 180]. */
    public static double separation(double a, double b) {
        return Math.abs(diff(a, b));
    }

    public static double rad(double deg) { return Math.toRadians(deg); }
    public static double deg(double rad) { return Math.toDegrees(rad); }
}
