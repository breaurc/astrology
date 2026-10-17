package ro.astrosite.engine.scoring;

import ro.astrosite.engine.astro.Angles;
import ro.astrosite.engine.astro.Aspect;
import ro.astrosite.engine.astro.NatalChart;
import ro.astrosite.engine.astro.Planet;
import ro.astrosite.engine.astro.ZodiacSign;
import ro.astrosite.engine.chinese.DayAlmanac;
import ro.astrosite.engine.numerology.Numerology;
import ro.astrosite.engine.numerology.NumerologyProfile;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static ro.astrosite.engine.scoring.Category.*;
import static ro.astrosite.engine.scoring.Factor.Source.*;

/**
 * Deterministic rules that turn astrological data into per-category factors.
 * Pure Java; unit-testable without Spring.
 */
public final class ScoringRules {

    private ScoringRules() {}

    static final Map<Planet, Set<Category>> PLANET_CATEGORIES = new EnumMap<>(Map.of(
            Planet.SUN, EnumSet.of(CAREER, GENERAL),
            Planet.MOON, EnumSet.of(HOME, LOVE),
            Planet.MERCURY, EnumSet.of(COMMUNICATION, TRAVEL),
            Planet.VENUS, EnumSet.of(LOVE, MONEY),
            Planet.MARS, EnumSet.of(CAREER, WELLBEING),
            Planet.JUPITER, EnumSet.of(MONEY, TRAVEL, CAREER),
            Planet.SATURN, EnumSet.of(CAREER, HOME),
            Planet.URANUS, EnumSet.of(TRAVEL, COMMUNICATION),
            Planet.NEPTUNE, EnumSet.of(WELLBEING, LOVE),
            Planet.PLUTO, EnumSet.of(MONEY, CAREER)));

    static final Map<Integer, Set<Category>> HOUSE_CATEGORIES = Map.ofEntries(
            Map.entry(1, EnumSet.of(WELLBEING, GENERAL)), Map.entry(2, EnumSet.of(MONEY)),
            Map.entry(3, EnumSet.of(COMMUNICATION, TRAVEL)), Map.entry(4, EnumSet.of(HOME)),
            Map.entry(5, EnumSet.of(LOVE)), Map.entry(6, EnumSet.of(WELLBEING, CAREER)),
            Map.entry(7, EnumSet.of(LOVE)), Map.entry(8, EnumSet.of(MONEY)),
            Map.entry(9, EnumSet.of(TRAVEL)), Map.entry(10, EnumSet.of(CAREER)),
            Map.entry(11, EnumSet.of(LOVE, COMMUNICATION)), Map.entry(12, EnumSet.of(WELLBEING)));

    static double significance(Planet p) {
        return switch (p) {
            case MOON -> 0.6; case SUN -> 0.8; case MERCURY -> 0.6; case VENUS, MARS -> 1.0;
            case JUPITER, SATURN -> 1.2; case URANUS, NEPTUNE, PLUTO -> 0.8;
        };
    }

    static boolean benefic(Planet p) {
        return p == Planet.VENUS || p == Planet.JUPITER || p == Planet.SUN || p == Planet.MOON;
    }

    // ------------------------------------------------------------ Western

    public static List<Factor> western(NatalChart natal, NatalChart transit) {
        List<Factor> out = new ArrayList<>();

        // 1. transits to natal planets
        for (Planet t : Planet.values()) {
            double tl = transit.positions().get(t);
            for (Planet n : Planet.values()) {
                double nl = natal.positions().get(n);
                Aspect a = Aspect.between(tl, nl, t.transitOrb());
                if (a == null) continue;
                double w = switch (a) {
                    case TRINE -> 1.0;
                    case SEXTILE -> 0.7;
                    case SQUARE -> -0.9;
                    case OPPOSITION -> -1.0;
                    case CONJUNCTION -> benefic(t) ? 0.8 : -0.6;
                };
                w *= significance(t);
                if (n.isLuminary() || n == Planet.VENUS || n == Planet.MARS) w *= 1.1;
                Set<Category> cats = EnumSet.copyOf(PLANET_CATEGORIES.get(t));
                cats.addAll(PLANET_CATEGORIES.get(n));
                out.add(new Factor(WESTERN, "transit." + a.name().toLowerCase(), round(w),
                        Map.of("transit", t.name(), "natal", n.name(),
                                "orb", String.format("%.1f", a.orbOf(tl, nl))), cats));
            }
        }

        // 2. transiting Moon and Sun through natal houses (only when houses are known)
        if (natal.ascendant() != null) {
            for (Planet t : List.of(Planet.MOON, Planet.SUN, Planet.VENUS, Planet.JUPITER)) {
                int house = natal.houseOf(transit.positions().get(t));
                Set<Category> cats = HOUSE_CATEGORIES.get(house);
                double w = t == Planet.MOON ? 0.3 : 0.15;
                out.add(new Factor(WESTERN, "transit.house", w,
                        Map.of("transit", t.name(), "house", String.valueOf(house)), cats));
            }
        }

        // 3. retrogrades
        if (transit.retrograde().get(Planet.MERCURY)) {
            out.add(new Factor(WESTERN, "retrograde", -1.0, Map.of("planet", "MERCURY"), EnumSet.of(COMMUNICATION)));
            out.add(new Factor(WESTERN, "retrograde", -0.6, Map.of("planet", "MERCURY"), EnumSet.of(TRAVEL, MONEY)));
        }
        if (transit.retrograde().get(Planet.VENUS)) {
            out.add(new Factor(WESTERN, "retrograde", -0.8, Map.of("planet", "VENUS"), EnumSet.of(LOVE, MONEY)));
        }
        if (transit.retrograde().get(Planet.MARS)) {
            out.add(new Factor(WESTERN, "retrograde", -0.6, Map.of("planet", "MARS"), EnumSet.of(CAREER, WELLBEING)));
        }

        // 4. Moon phase
        double phase = Angles.norm360(transit.positions().get(Planet.MOON) - transit.positions().get(Planet.SUN));
        String phaseName = phaseName(phase);
        switch (phaseName) {
            case "new" -> out.add(new Factor(WESTERN, "phase.new", 0.4, Map.of(), EnumSet.of(CAREER, MONEY, GENERAL)));
            case "waxing" -> out.add(new Factor(WESTERN, "phase.waxing", 0.3, Map.of(), EnumSet.of(CAREER, LOVE, MONEY)));
            case "full" -> {
                out.add(new Factor(WESTERN, "phase.full", 0.3, Map.of(), EnumSet.of(LOVE, COMMUNICATION)));
                out.add(new Factor(WESTERN, "phase.full.tension", -0.3, Map.of(), EnumSet.of(WELLBEING, HOME)));
            }
            case "waning" -> {
                out.add(new Factor(WESTERN, "phase.waning", 0.3, Map.of(), EnumSet.of(WELLBEING, HOME)));
                out.add(new Factor(WESTERN, "phase.waning.starts", -0.3, Map.of(), EnumSet.of(CAREER, MONEY)));
            }
            default -> { }
        }

        // 5. element of the transiting Moon's sign
        ZodiacSign moonSign = transit.moonSign();
        Set<Category> elementCats = switch (moonSign.element()) {
            case WATER -> EnumSet.of(LOVE, HOME);
            case FIRE -> EnumSet.of(TRAVEL, CAREER);
            case AIR -> EnumSet.of(COMMUNICATION, LOVE);
            case EARTH -> EnumSet.of(MONEY, HOME);
        };
        out.add(new Factor(WESTERN, "moon.element", 0.2, Map.of("sign", moonSign.name()), elementCats));

        // 6. transiting Moon vs natal Sun sign
        ZodiacSign sun = natal.sunSign();
        int signDiff = (moonSign.index() - sun.index() + 12) % 12;
        if (moonSign.element() == sun.element()) {
            out.add(new Factor(WESTERN, "moon.sun.harmony", 0.3, Map.of("sign", moonSign.name()),
                    EnumSet.of(GENERAL, WELLBEING, LOVE)));
        } else if (signDiff == 3 || signDiff == 9 || signDiff == 6) {
            out.add(new Factor(WESTERN, "moon.sun.tension", -0.3, Map.of("sign", moonSign.name()),
                    EnumSet.of(GENERAL, WELLBEING, HOME)));
        }
        return out;
    }

    public static String phaseName(double elongation) {
        if (elongation < 30 || elongation >= 345) return "new";
        if (elongation < 165) return "waxing";
        if (elongation < 195) return "full";
        if (elongation < 315) return "waning";
        return "balsamic";
    }

    // ------------------------------------------------------------ Chinese

    public static List<Factor> chinese(DayAlmanac day) {
        List<Factor> out = new ArrayList<>();
        for (Category c : day.favorable()) {
            if (c == GENERAL) continue;
            out.add(new Factor(CHINESE, "almanac.favorable", 0.8, Map.of("category", c.name()), EnumSet.of(c)));
        }
        for (Category c : day.unfavorable()) {
            if (c == GENERAL) continue;
            out.add(new Factor(CHINESE, "almanac.unfavorable", -0.8, Map.of("category", c.name()), EnumSet.of(c)));
        }
        out.add(day.auspiciousDay()
                ? new Factor(CHINESE, "almanac.auspicious", 0.3, Map.of(), EnumSet.allOf(Category.class))
                : new Factor(CHINESE, "almanac.inauspicious", -0.2, Map.of(), EnumSet.allOf(Category.class)));
        double rel = switch (day.relationToNatal()) {
            case CLASH -> -0.8; case HARM -> -0.4; case HARMONY -> 0.6; case TRINE -> 0.5; case NEUTRAL -> 0;
        };
        if (rel != 0) {
            out.add(new Factor(CHINESE, "branch." + day.relationToNatal().name().toLowerCase(), rel,
                    Map.of("dayAnimal", day.dayAnimal()), EnumSet.allOf(Category.class)));
        }
        return out;
    }

    // --------------------------------------------------------- Numerology

    public static List<Factor> numerology(NumerologyProfile n) {
        List<Factor> out = new ArrayList<>();
        int d = n.personalDay();
        Map<String, String> p = Map.of("number", String.valueOf(d), "theme", Numerology.theme(d));
        String code = "personalDay." + d;
        switch (d) {
            case 1 -> out.add(f(code, 0.5, p, CAREER, GENERAL));
            case 2 -> { out.add(f(code, 0.5, p, LOVE)); out.add(f(code, 0.3, p, COMMUNICATION)); }
            case 3 -> { out.add(f(code, 0.6, p, LOVE)); out.add(f(code, 0.5, p, COMMUNICATION)); }
            case 4 -> { out.add(f(code, 0.3, p, CAREER, MONEY)); out.add(f(code, -0.2, p, TRAVEL)); }
            case 5 -> { out.add(f(code, 0.6, p, TRAVEL)); out.add(f(code, 0.3, p, COMMUNICATION)); out.add(f(code, -0.2, p, HOME)); }
            case 6 -> { out.add(f(code, 0.6, p, HOME)); out.add(f(code, 0.4, p, LOVE)); }
            case 7 -> { out.add(f(code, 0.5, p, WELLBEING)); out.add(f(code, -0.3, p, LOVE)); out.add(f(code, -0.2, p, CAREER)); }
            case 8 -> { out.add(f(code, 0.6, p, MONEY)); out.add(f(code, 0.5, p, CAREER)); }
            case 9 -> { out.add(f(code, 0.3, p, WELLBEING, HOME)); out.add(f(code, -0.2, p, MONEY)); }
            case 11 -> out.add(f(code, 0.3, p, LOVE, WELLBEING));
            case 22 -> { out.add(f(code, 0.5, p, CAREER)); out.add(f(code, 0.3, p, MONEY)); }
            case 33 -> out.add(f(code, 0.4, p, LOVE, HOME));
            default -> { }
        }
        return out;
    }

    private static Factor f(String code, double w, Map<String, String> p, Category... cats) {
        return new Factor(NUMEROLOGY, code, w, p, EnumSet.of(cats[0], cats));
    }

    // ---------------------------------------------------------- Aggregate

    /** Sum factor weights per category and map to a 1..10 score. */
    public static Map<Category, Integer> aggregate(List<Factor> factors) {
        Map<Category, Double> sums = new EnumMap<>(Category.class);
        for (Category c : Category.values()) sums.put(c, 0.0);
        for (Factor f : factors) {
            for (Category c : f.categories()) sums.merge(c, f.weight(), Double::sum);
        }
        Map<Category, Integer> scores = new EnumMap<>(Category.class);
        double generalSum = 0;
        int n = 0;
        for (Category c : Category.values()) {
            if (c == GENERAL) continue;
            int s = toScore(sums.get(c));
            scores.put(c, s);
            generalSum += s;
            n++;
        }
        double general = generalSum / n + sums.get(GENERAL) * 0.5;
        scores.put(GENERAL, (int) Math.round(Math.max(1, Math.min(10, general))));
        return scores;
    }

    /** Empirical offset: the rule set has a mild positive bias (benefic transits and house passages). */
    static final double BIAS = 0.45;

    /** Soft mapping around the bias: neutral → 5.5, ±1 → ~7.2/3.8, ±3 → ~9.2/1.8; saturates gracefully. */
    public static int toScore(double sum) {
        double s = 5.5 + 4.5 * Math.tanh((sum - BIAS) / 2.5);
        return (int) Math.round(Math.max(1, Math.min(10, s)));
    }

    static double round(double v) { return Math.round(v * 100.0) / 100.0; }
}
