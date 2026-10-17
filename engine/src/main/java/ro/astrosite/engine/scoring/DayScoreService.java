package ro.astrosite.engine.scoring;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import ro.astrosite.engine.astro.BirthData;
import ro.astrosite.engine.astro.ChartCalculator;
import ro.astrosite.engine.astro.NatalChart;
import ro.astrosite.engine.astro.Planet;
import ro.astrosite.engine.astro.Angles;
import ro.astrosite.engine.chinese.ChineseProfile;
import ro.astrosite.engine.chinese.ChineseService;
import ro.astrosite.engine.chinese.DayAlmanac;
import ro.astrosite.engine.numerology.Numerology;
import ro.astrosite.engine.numerology.NumerologyProfile;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Combines the three systems into one DayScores for a person and a date. Results are cached. */
@Service
public class DayScoreService {

    private final ChartCalculator calculator = new ChartCalculator();
    private final ChineseService chinese;

    public DayScoreService(ChineseService chinese) {
        this.chinese = chinese;
    }

    @Cacheable(cacheNames = "dayScores", key = "#birth.cacheKey() + '|' + #date")
    public DayScores scores(BirthData birth, LocalDate date) {
        NatalChart natal = calculator.compute(birth);
        // transit snapshot at local noon in the person's zone
        BirthData dayData = new BirthData(null, date, LocalTime.NOON, birth.zone(), birth.latitude(), birth.longitude());
        NatalChart transit = calculator.compute(dayData);

        ChineseProfile profile = chinese.profile(birth);
        DayAlmanac almanac = chinese.almanac(date, profile);
        NumerologyProfile numerology = Numerology.profile(birth.name(), birth.date(), date);

        List<Factor> factors = new ArrayList<>();
        factors.addAll(ScoringRules.western(natal, transit));
        factors.addAll(ScoringRules.chinese(almanac));
        factors.addAll(ScoringRules.numerology(numerology));

        Map<String, String> context = new LinkedHashMap<>();
        context.put("sunSign", natal.sunSign().name());
        context.put("moonSign", natal.moonSign().name());
        context.put("risingSign", natal.risingSign() == null ? null : natal.risingSign().name());
        context.put("transitMoonSign", transit.moonSign().name());
        context.put("moonPhase", ScoringRules.phaseName(
                Angles.norm360(transit.positions().get(Planet.MOON) - transit.positions().get(Planet.SUN))));
        context.put("chineseAnimal", profile.animal());
        context.put("dayAnimal", almanac.dayAnimal());
        context.put("branchRelation", almanac.relationToNatal().name());
        context.put("personalDay", String.valueOf(numerology.personalDay()));
        context.put("mercuryRetrograde", String.valueOf(transit.retrograde().get(Planet.MERCURY)));

        return new DayScores(date, ScoringRules.aggregate(factors), factors, context);
    }
}
