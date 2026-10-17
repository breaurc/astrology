package ro.astrosite.engine.numerology;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class NumerologyTest {

    @Test
    void reduceKeepsMasterNumbers() {
        assertEquals(11, Numerology.reduce(29));
        assertEquals(22, Numerology.reduce(22));
        assertEquals(7, Numerology.reduce(16));
        assertEquals(1, Numerology.reduce(10));
    }

    @Test
    void lifePathExample() {
        // 1985-03-20: 3 + 2 + (1+9+8+5=23->5) = 10 -> 1
        NumerologyProfile p = Numerology.profile(null, LocalDate.of(1985, 3, 20), LocalDate.of(2026, 10, 17));
        assertEquals(1, p.lifePath());
        assertEquals(2, p.birthday());
        // personal year 2026: 3 + 2 + (2+0+2+6=10->1) = 6; month 6+10=16->7; day 7+17=24->6
        assertEquals(6, p.personalYear());
        assertEquals(7, p.personalMonth());
        assertEquals(6, p.personalDay());
    }

    @Test
    void romanianDiacriticsAreNormalized() {
        assertEquals("STEFANITA", Numerology.normalize("Ștefăniță"));
        assertEquals(1, Numerology.letterValue('A'));
        assertEquals(1, Numerology.letterValue('J'));
        assertEquals(8, Numerology.letterValue('Z'));
    }
}
