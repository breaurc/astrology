package ro.astrosite.engine.astro;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Birth (or event) data. Local date/time + IANA zone are converted with java.time,
 * which applies the historical timezone/DST rules of the tz database.
 *
 * @param time      null when the birth time is unknown (noon is used; houses are then unreliable)
 * @param zone      IANA zone id, e.g. "Europe/Bucharest"
 * @param latitude  degrees, north positive
 * @param longitude degrees, east positive
 */
public record BirthData(String name, LocalDate date, LocalTime time, String zone,
                        double latitude, double longitude) {

    public boolean timeKnown() { return time != null; }

    public ZonedDateTime zoned() {
        LocalTime t = time != null ? time : LocalTime.NOON;
        return date.atTime(t).atZone(ZoneId.of(zone));
    }

    public Instant instant() { return zoned().toInstant(); }

    public double julianDay() { return JulianDay.fromInstant(instant()); }

    /** Stable key used for caching. */
    public String cacheKey() {
        return date + "T" + (time == null ? "unknown" : time) + "@" + zone + "/" + latitude + "/" + longitude;
    }
}
