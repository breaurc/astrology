package ro.astrosite.engine.scoring;

import org.junit.jupiter.api.Test;
import ro.astrosite.engine.astro.BirthData;
import ro.astrosite.engine.astro.ChartCalculator;
import ro.astrosite.engine.astro.NatalChart;
import ro.astrosite.engine.chinese.DayAlmanac;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ScoringRulesTest {

    private final ChartCalculator calc = new ChartCalculator();

    @Test
    void westernFactorsAreProducedAndScoresStayInRange() {
        BirthData birth = new BirthData("Test", LocalDate.of(1985, 3, 20), LocalTime.of(14, 30), "Europe/Bucharest", 47.16, 27.59);
        NatalChart natal = calc.compute(birth);
        NatalChart transit = calc.compute(new BirthData(null, LocalDate.of(2026, 10, 17), LocalTime.NOON, "Europe/Bucharest", 47.16, 27.59));
        List<Factor> factors = ScoringRules.western(natal, transit);
        assertFalse(factors.isEmpty());
        Map<Category, Integer> scores = ScoringRules.aggregate(factors);
        for (Category c : Category.values()) {
            int s = scores.get(c);
            assertTrue(s >= 1 && s <= 10, c + " out of range: " + s);
        }
    }

    @Test
    void chineseClashLowersEveryCategory() {
        DayAlmanac clash = new DayAlmanac("HORSE", "午", List.of(), List.of(), Set.of(), Set.of(), false,
                DayAlmanac.BranchRelation.CLASH);
        Map<Category, Integer> scores = ScoringRules.aggregate(ScoringRules.chinese(clash));
        assertTrue(scores.get(Category.LOVE) < 5);
        assertTrue(scores.get(Category.CAREER) < 5);
    }

    @Test
    void almanacFavorableRaisesCategory() {
        DayAlmanac good = new DayAlmanac("DRAGON", "辰", List.of("嫁娶"), List.of(), Set.of(Category.LOVE), Set.of(), true,
                DayAlmanac.BranchRelation.HARMONY);
        Map<Category, Integer> scores = ScoringRules.aggregate(ScoringRules.chinese(good));
        assertTrue(scores.get(Category.LOVE) >= 7, "love score " + scores.get(Category.LOVE));
    }

    @Test
    void neutralInputGivesMiddleScore() {
        assertEquals(5, ScoringRules.toScore(0));
        assertEquals(6, ScoringRules.toScore(ScoringRules.BIAS));
        assertEquals(10, ScoringRules.toScore(5));
        assertEquals(1, ScoringRules.toScore(-5));
    }
}
