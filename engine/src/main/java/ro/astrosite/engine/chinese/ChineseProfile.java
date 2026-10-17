package ro.astrosite.engine.chinese;

import java.util.List;

/**
 * Chinese astrology profile of a person.
 *
 * @param animal       zodiac animal (by lunar year), English key e.g. "DRAGON"
 * @param element      element of the year stem: WOOD, FIRE, EARTH, METAL, WATER
 * @param yinYang      "YIN" or "YANG"
 * @param yearBranch   earthly branch character of the birth year, e.g. "辰"
 * @param pillars      BaZi four pillars (year, month, day, hour) as "stem+branch" strings; hour is null when time unknown
 * @param dayMaster    day stem (the "self" in BaZi), e.g. "甲"
 * @param lunarDate    lunar date in Chinese, informational
 */
public record ChineseProfile(String animal, String element, String yinYang, String yearBranch,
                             List<String> pillars, String dayMaster, String lunarDate) {
}
