package ro.astrosite.engine.chinese;

import com.nlf.calendar.EightChar;
import com.nlf.calendar.Lunar;
import com.nlf.calendar.Solar;
import org.springframework.stereotype.Service;
import ro.astrosite.engine.astro.BirthData;
import ro.astrosite.engine.scoring.Category;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Chinese zodiac, BaZi pillars and the daily almanac, backed by lunar-java.
 */
@Service
public class ChineseService {

    static final Map<String, String> ANIMALS = Map.ofEntries(
            Map.entry("鼠", "RAT"), Map.entry("牛", "OX"), Map.entry("虎", "TIGER"), Map.entry("兔", "RABBIT"),
            Map.entry("龙", "DRAGON"), Map.entry("蛇", "SNAKE"), Map.entry("马", "HORSE"), Map.entry("羊", "GOAT"),
            Map.entry("猴", "MONKEY"), Map.entry("鸡", "ROOSTER"), Map.entry("狗", "DOG"), Map.entry("猪", "PIG"));

    static final String STEMS = "甲乙丙丁戊己庚辛壬癸";
    static final String BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
    static final String[] STEM_ELEMENTS = {"WOOD", "WOOD", "FIRE", "FIRE", "EARTH", "EARTH", "METAL", "METAL", "WATER", "WATER"};

    /** Six harmonies (liu he) pairs. */
    static final String[] HARMONY = {"子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"};
    /** Six clashes (liu chong). */
    static final String[] CLASH = {"子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"};
    /** Six harms (liu hai). */
    static final String[] HARM = {"子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"};
    /** Three harmonies (san he) groups. */
    static final String[] TRINE = {"申子辰", "亥卯未", "寅午戌", "巳酉丑"};

    /** Almanac activity → categories. Keys are the terms lunar-java returns from getDayYi()/getDayJi(). */
    static final Map<String, Set<Category>> ACTIVITY_CATEGORIES = Map.ofEntries(
            Map.entry("嫁娶", EnumSet.of(Category.LOVE)),
            Map.entry("纳采", EnumSet.of(Category.LOVE)),
            Map.entry("订盟", EnumSet.of(Category.LOVE)),
            Map.entry("纳婿", EnumSet.of(Category.LOVE)),
            Map.entry("会亲友", EnumSet.of(Category.LOVE, Category.COMMUNICATION)),
            Map.entry("冠笄", EnumSet.of(Category.LOVE)),
            Map.entry("安床", EnumSet.of(Category.HOME, Category.LOVE)),
            Map.entry("赴任", EnumSet.of(Category.CAREER)),
            Map.entry("上官", EnumSet.of(Category.CAREER)),
            Map.entry("上官赴任", EnumSet.of(Category.CAREER)),
            Map.entry("开市", EnumSet.of(Category.CAREER, Category.MONEY)),
            Map.entry("开工", EnumSet.of(Category.CAREER)),
            Map.entry("竖柱", EnumSet.of(Category.CAREER)),
            Map.entry("上梁", EnumSet.of(Category.CAREER, Category.HOME)),
            Map.entry("安机械", EnumSet.of(Category.CAREER)),
            Map.entry("立券", EnumSet.of(Category.MONEY, Category.COMMUNICATION)),
            Map.entry("交易", EnumSet.of(Category.MONEY, Category.COMMUNICATION)),
            Map.entry("纳财", EnumSet.of(Category.MONEY)),
            Map.entry("出货财", EnumSet.of(Category.MONEY)),
            Map.entry("开仓", EnumSet.of(Category.MONEY)),
            Map.entry("纳畜", EnumSet.of(Category.MONEY)),
            Map.entry("出行", EnumSet.of(Category.TRAVEL)),
            Map.entry("造船", EnumSet.of(Category.TRAVEL)),
            Map.entry("入宅", EnumSet.of(Category.HOME)),
            Map.entry("移徙", EnumSet.of(Category.HOME, Category.TRAVEL)),
            Map.entry("修造", EnumSet.of(Category.HOME)),
            Map.entry("动土", EnumSet.of(Category.HOME)),
            Map.entry("安门", EnumSet.of(Category.HOME)),
            Map.entry("作灶", EnumSet.of(Category.HOME)),
            Map.entry("造屋", EnumSet.of(Category.HOME)),
            Map.entry("盖屋", EnumSet.of(Category.HOME)),
            Map.entry("安香", EnumSet.of(Category.HOME)),
            Map.entry("求医", EnumSet.of(Category.WELLBEING)),
            Map.entry("治病", EnumSet.of(Category.WELLBEING)),
            Map.entry("沐浴", EnumSet.of(Category.WELLBEING)),
            Map.entry("理发", EnumSet.of(Category.WELLBEING)),
            Map.entry("解除", EnumSet.of(Category.WELLBEING)),
            Map.entry("整手足甲", EnumSet.of(Category.WELLBEING)),
            Map.entry("经络", EnumSet.of(Category.WELLBEING)),
            Map.entry("祈福", EnumSet.of(Category.WELLBEING, Category.GENERAL)),
            Map.entry("诸事不宜", EnumSet.allOf(Category.class)),
            Map.entry("馀事勿取", EnumSet.allOf(Category.class))
    );

    public ChineseProfile profile(BirthData birth) {
        ZonedDateTime local = birth.zoned();
        Lunar lunar = toLunar(local.toLocalDate(), birth.timeKnown() ? local.toLocalTime() : null);
        EightChar ec = lunar.getEightChar();

        String yearGan = lunar.getYearGan();
        int stemIdx = STEMS.indexOf(yearGan);
        List<String> pillars = new ArrayList<>();
        pillars.add(ec.getYear());
        pillars.add(ec.getMonth());
        pillars.add(ec.getDay());
        pillars.add(birth.timeKnown() ? ec.getTime() : null);

        return new ChineseProfile(
                ANIMALS.getOrDefault(lunar.getYearShengXiao(), lunar.getYearShengXiao()),
                STEM_ELEMENTS[Math.max(stemIdx, 0)],
                stemIdx % 2 == 0 ? "YANG" : "YIN",
                lunar.getYearZhi(),
                pillars,
                lunar.getDayGan(),
                lunar.toString());
    }

    public DayAlmanac almanac(LocalDate date, ChineseProfile natal) {
        Lunar lunar = toLunar(date, null);
        List<String> yi = lunar.getDayYi();
        List<String> ji = lunar.getDayJi();

        // Different activities can point to the same category (e.g. 安床 suitable and 嫁娶 to avoid both
        // touch LOVE). Resolve each category by majority so a day never reads as both favorable and
        // unfavorable for the same area; ties leave the category neutral.
        Map<Category, Integer> votes = new EnumMap<>(Category.class);
        for (String s : yi) for (Category c : ACTIVITY_CATEGORIES.getOrDefault(s, Set.of())) votes.merge(c, 1, Integer::sum);
        for (String s : ji) for (Category c : ACTIVITY_CATEGORIES.getOrDefault(s, Set.of())) votes.merge(c, -1, Integer::sum);
        Set<Category> favorable = EnumSet.noneOf(Category.class);
        Set<Category> unfavorable = EnumSet.noneOf(Category.class);
        votes.forEach((c, v) -> { if (v > 0) favorable.add(c); else if (v < 0) unfavorable.add(c); });

        String dayZhi = lunar.getDayZhi();
        boolean auspicious = "吉".equals(lunar.getDayTianShenLuck());
        DayAlmanac.BranchRelation rel = natal == null ? DayAlmanac.BranchRelation.NEUTRAL
                : relation(dayZhi, natal.yearBranch());

        return new DayAlmanac(
                ANIMALS.getOrDefault(lunar.getDayShengXiao(), lunar.getDayShengXiao()),
                dayZhi, yi, ji, favorable, unfavorable, auspicious, rel);
    }

    static DayAlmanac.BranchRelation relation(String a, String b) {
        if (a == null || b == null) return DayAlmanac.BranchRelation.NEUTRAL;
        if (contains(CLASH, a, b)) return DayAlmanac.BranchRelation.CLASH;
        if (contains(HARM, a, b)) return DayAlmanac.BranchRelation.HARM;
        if (contains(HARMONY, a, b)) return DayAlmanac.BranchRelation.HARMONY;
        for (String g : TRINE) if (g.contains(a) && g.contains(b) && !a.equals(b)) return DayAlmanac.BranchRelation.TRINE;
        return DayAlmanac.BranchRelation.NEUTRAL;
    }

    private static boolean contains(String[] pairs, String a, String b) {
        for (String p : pairs) if (p.contains(a) && p.contains(b) && !a.equals(b)) return true;
        return false;
    }

    private static Lunar toLunar(LocalDate d, LocalTime t) {
        Solar solar = t == null
                ? Solar.fromYmd(d.getYear(), d.getMonthValue(), d.getDayOfMonth())
                : Solar.fromYmdHms(d.getYear(), d.getMonthValue(), d.getDayOfMonth(), t.getHour(), t.getMinute(), 0);
        return solar.getLunar();
    }
}
