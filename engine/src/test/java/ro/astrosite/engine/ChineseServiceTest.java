package ro.astrosite.engine;

import org.junit.jupiter.api.Test;
import ro.astrosite.engine.astro.BirthData;
import ro.astrosite.engine.chinese.ChineseProfile;
import ro.astrosite.engine.chinese.ChineseService;
import ro.astrosite.engine.chinese.DayAlmanac;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

/** Verifies the lunar-java integration. */
class ChineseServiceTest {

    private final ChineseService service = new ChineseService();

    @Test
    void chineseNewYear2024SwitchesRabbitToDragon() {
        ChineseProfile before = service.profile(new BirthData(null, LocalDate.of(2024, 2, 9), LocalTime.NOON, "Asia/Shanghai", 31, 121));
        ChineseProfile after = service.profile(new BirthData(null, LocalDate.of(2024, 2, 10), LocalTime.NOON, "Asia/Shanghai", 31, 121));
        assertEquals("RABBIT", before.animal());
        assertEquals("DRAGON", after.animal());
        assertEquals("WOOD", after.element());
        assertEquals("YANG", after.yinYang());
        assertEquals(4, after.pillars().size());
    }

    @Test
    void almanacHasActivitiesAndRelation() {
        ChineseProfile natal = service.profile(new BirthData(null, LocalDate.of(1985, 3, 20), null, "Europe/Bucharest", 47.16, 27.59));
        assertEquals("OX", natal.animal());
        DayAlmanac day = service.almanac(LocalDate.of(2026, 10, 17), natal);
        assertNotNull(day.dayBranch());
        assertNotNull(day.suitable());
        assertNotNull(day.relationToNatal());
    }
}
