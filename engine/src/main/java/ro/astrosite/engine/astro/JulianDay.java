package ro.astrosite.engine.astro;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

/** Julian Day helpers (UT). */
public final class JulianDay {
    public static final double J2000 = 2451545.0;

    private JulianDay() {}

    public static double fromInstant(Instant instant) {
        ZonedDateTime utc = instant.atZone(ZoneOffset.UTC);
        int y = utc.getYear();
        int m = utc.getMonthValue();
        double d = utc.getDayOfMonth()
                + (utc.getHour() + utc.getMinute() / 60.0 + utc.getSecond() / 3600.0) / 24.0;
        if (m <= 2) { y -= 1; m += 12; }
        int a = y / 100;
        int b = 2 - a + a / 4;
        return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
    }

    public static Instant toInstant(double jd) {
        double seconds = (jd - 2440587.5) * 86400.0;
        return Instant.ofEpochMilli(Math.round(seconds * 1000.0));
    }

    /** Julian centuries since J2000. */
    public static double centuries(double jd) {
        return (jd - J2000) / 36525.0;
    }
}
