package ro.astrosite.engine.api;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ro.astrosite.engine.api.dto.AskRequest;
import ro.astrosite.engine.api.dto.BestDaysRequest;
import ro.astrosite.engine.api.dto.BirthRequest;
import ro.astrosite.engine.api.dto.ChartResponse;
import ro.astrosite.engine.ask.AskAnswer;
import ro.astrosite.engine.ask.AskService;
import ro.astrosite.engine.ask.FactorTexts;
import ro.astrosite.engine.astro.BirthData;
import ro.astrosite.engine.astro.ChartCalculator;
import ro.astrosite.engine.chinese.ChineseProfile;
import ro.astrosite.engine.chinese.ChineseService;
import ro.astrosite.engine.chinese.DayAlmanac;
import ro.astrosite.engine.numerology.Numerology;
import ro.astrosite.engine.numerology.NumerologyProfile;
import ro.astrosite.engine.scoring.Category;
import ro.astrosite.engine.scoring.DayScoreService;
import ro.astrosite.engine.scoring.DayScores;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AstroController {

    private final ChartCalculator calculator = new ChartCalculator();
    private final ChineseService chinese;
    private final DayScoreService dayScores;
    private final AskService ask;
    private final FactorTexts texts;

    public AstroController(ChineseService chinese, DayScoreService dayScores, AskService ask, FactorTexts texts) {
        this.chinese = chinese;
        this.dayScores = dayScores;
        this.ask = ask;
        this.texts = texts;
    }

    @PostMapping("/chart")
    public ChartResponse chart(@Valid @RequestBody BirthRequest req) {
        return ChartResponse.from(calculator.compute(req.toBirthData()));
    }

    @PostMapping("/chinese")
    public Map<String, Object> chinese(@Valid @RequestBody BirthRequest req,
                                       @RequestParam(required = false) LocalDate date) {
        BirthData b = req.toBirthData();
        ChineseProfile profile = chinese.profile(b);
        DayAlmanac almanac = chinese.almanac(date != null ? date : today(b), profile);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("profile", profile);
        out.put("today", almanac);
        return out;
    }

    @PostMapping("/numerology")
    public NumerologyProfile numerology(@Valid @RequestBody BirthRequest req,
                                        @RequestParam(required = false) LocalDate date) {
        BirthData b = req.toBirthData();
        return Numerology.profile(b.name(), b.date(), date != null ? date : today(b));
    }

    /** Scores for every category on a day, with localized reasons. */
    @PostMapping("/day")
    public Map<String, Object> day(@Valid @RequestBody BirthRequest req,
                                   @RequestParam(required = false) LocalDate date,
                                   @RequestParam(defaultValue = "en") String locale) {
        BirthData b = req.toBirthData();
        LocalDate d = date != null ? date : today(b);
        Locale loc = Locale.forLanguageTag(locale);
        DayScores s = dayScores.scores(b, d);
        Map<String, Object> categories = new LinkedHashMap<>();
        for (Category c : Category.values()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("score", s.score(c));
            entry.put("verdict", DayScores.verdict(s.score(c)));
            entry.put("label", texts.label(c.name(), loc));
            entry.put("reasons", ask.reasons(s, c, loc).stream().limit(4).toList());
            categories.put(c.name(), entry);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("date", d);
        out.put("context", s.context());
        out.put("categories", categories);
        out.put("disclaimer", texts.message("disclaimer", loc));
        return out;
    }

    @PostMapping("/ask")
    public AskAnswer ask(@Valid @RequestBody AskRequest req) {
        BirthData b = req.birth().toBirthData();
        LocalDate d = req.date() != null ? req.date() : today(b);
        return ask.ask(b, d, req.question().trim(), locale(req.locale()));
    }

    @PostMapping("/best-days")
    public List<AskService.BestDay> bestDays(@Valid @RequestBody BestDaysRequest req) {
        BirthData b = req.birth().toBirthData();
        LocalDate from = req.from() != null ? req.from() : today(b);
        int days = req.days() != null ? req.days() : 30;
        int limit = req.limit() != null ? req.limit() : 5;
        return ask.bestDays(b, req.category(), from, days, limit, locale(req.locale()));
    }

    private static LocalDate today(BirthData b) {
        return LocalDate.now(ZoneId.of(b.zone()));
    }

    private static Locale locale(String tag) {
        return tag == null || tag.isBlank() ? Locale.ENGLISH : Locale.forLanguageTag(tag);
    }
}
