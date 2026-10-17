package ro.astrosite.engine.astro;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

class EphemerisTest {

    @Test
    void julianDayOfJ2000() {
        assertEquals(2451545.0, JulianDay.fromInstant(Instant.parse("2000-01-01T12:00:00Z")), 1e-9);
    }

    @Test
    void sunLongitudeMatchesMeeusExample25a() {
        // Meeus example 25.a: 1992 Oct 13, 0h TD -> apparent longitude 199.9060 (TD vs UT differs by ~1 min)
        double jd = JulianDay.fromInstant(Instant.parse("1992-10-13T00:00:00Z"));
        assertEquals(199.906, Ephemeris.sunLongitude(jd), 0.01);
    }

    @Test
    void moonLongitudeMatchesMeeusExample47a() {
        // Meeus example 47.a: 1992 April 12, 0h TD -> apparent longitude 133.167265
        double jd = JulianDay.fromInstant(Instant.parse("1992-04-12T00:00:00Z"));
        assertEquals(133.1673, Ephemeris.moonLongitude(jd), 0.01);
    }

    @Test
    void siderealTimeMatchesMeeusExample12a() {
        // 1987 April 10, 0h UT -> GMST 13h10m46.3668s = 197.693195°
        double jd = JulianDay.fromInstant(Instant.parse("1987-04-10T00:00:00Z"));
        assertEquals(197.693195, Ephemeris.gmst(jd), 0.001);
    }

    @Test
    void marsRetrogradeInNovember2022() {
        assertTrue(Ephemeris.isRetrograde(Planet.MARS, JulianDay.fromInstant(Instant.parse("2022-11-15T00:00:00Z"))));
        assertFalse(Ephemeris.isRetrograde(Planet.MARS, JulianDay.fromInstant(Instant.parse("2022-09-15T00:00:00Z"))));
    }

    @Test
    void sunEntersAriesAtTheEquinox() {
        // 2025 March equinox: 09:01 UTC
        BirthData before = new BirthData(null, LocalDate.of(2025, 3, 20), LocalTime.of(8, 0), "UTC", 0, 0);
        BirthData after = new BirthData(null, LocalDate.of(2025, 3, 20), LocalTime.of(10, 0), "UTC", 0, 0);
        ChartCalculator calc = new ChartCalculator();
        assertEquals(ZodiacSign.PISCES, calc.compute(before).sunSign());
        assertEquals(ZodiacSign.ARIES, calc.compute(after).sunSign());
    }

    @Test
    void ascendantFollowsMidheaven() {
        BirthData b = new BirthData("Test", LocalDate.of(1985, 3, 20), LocalTime.of(14, 30), "Europe/Bucharest", 47.16, 27.59);
        NatalChart c = new ChartCalculator().compute(b);
        assertNotNull(c.ascendant());
        double d = Angles.norm360(c.ascendant() - c.midheaven());
        assertTrue(d > 0 && d < 180, "ASC must be within 180° after MC, was " + d);
        assertEquals(12, c.houseCusps().size());
        assertEquals(1, c.houseOf(c.ascendant()));
    }

    @Test
    void unknownTimeGivesNoHouses() {
        BirthData b = new BirthData("Test", LocalDate.of(1985, 3, 20), null, "Europe/Bucharest", 47.16, 27.59);
        NatalChart c = new ChartCalculator().compute(b);
        assertNull(c.ascendant());
        assertTrue(c.houseCusps().isEmpty());
        assertEquals(0, c.houseOf(100));
    }
}
