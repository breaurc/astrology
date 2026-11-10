package ro.astrosite.engine.api;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.astrosite.engine.api.dto.CalendarRequest;
import ro.astrosite.engine.api.dto.ChatRequest;
import ro.astrosite.engine.api.dto.ReadingRequest;
import ro.astrosite.engine.api.dto.SkyRequest;
import ro.astrosite.engine.api.dto.SkyResponse;
import ro.astrosite.engine.ask.LlmClient;
import ro.astrosite.engine.astro.BirthData;
import ro.astrosite.engine.reading.CalendarService;
import ro.astrosite.engine.reading.ChatService;
import ro.astrosite.engine.reading.ReadingService;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The three endpoints behind the funnel (SPEC sections 3.1, 3.2, 3.4). They are pure compute + narration:
 * identity, quotas and credits are enforced by the web tier, which is the only caller of this engine.
 */
@RestController
@RequestMapping("/api")
public class ReadingController {

    private final ReadingService readings;
    private final CalendarService calendar;
    private final ChatService chat;

    public ReadingController(ReadingService readings, CalendarService calendar, ChatService chat) {
        this.readings = readings;
        this.calendar = calendar;
        this.chat = chat;
    }

    /** The free reading: facts for the chosen system + about 4 lines for the day. Cached by inputs and date. */
    @PostMapping("/reading")
    public ReadingService.Reading reading(@Valid @RequestBody ReadingRequest req) {
        BirthData b = req.birth().toBirthData();
        LocalDate d = req.date() != null ? req.date() : today(b);
        return readings.reading(b, req.system(), d, locale(req.locale()));
    }

    /** The day's planets over the natal chart, for the wheel drawing (any day); no LLM call. */
    @PostMapping("/sky")
    public SkyResponse sky(@Valid @RequestBody SkyRequest req) {
        BirthData b = req.birth().toBirthData();
        LocalDate d = req.date() != null ? req.date() : today(b);
        return readings.sky(b, d);
    }

    /** Day verdicts from transits; no LLM call. */
    @PostMapping("/calendar")
    public Map<String, Object> calendar(@Valid @RequestBody CalendarRequest req) {
        BirthData b = req.birth().toBirthData();
        LocalDate from = req.from() != null ? req.from() : today(b);
        int days = req.days() != null ? req.days() : 7;
        List<CalendarService.CalendarDay> list = calendar.calendar(b, from, days, locale(req.locale()));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("from", from);
        out.put("days", list);
        return out;
    }

    /** One conversation turn. */
    @PostMapping("/chat")
    public ChatService.Turn chat(@Valid @RequestBody ChatRequest req) {
        BirthData b = req.birth().toBirthData();
        LocalDate d = req.date() != null ? req.date() : today(b);
        List<LlmClient.Message> history = req.history() == null ? List.of()
                : req.history().stream().map(m -> new LlmClient.Message(m.role(), m.text())).toList();
        return chat.reply(b, d, locale(req.locale()), history, req.message().trim());
    }

    private static LocalDate today(BirthData b) {
        return LocalDate.now(ZoneId.of(b.zone()));
    }

    private static Locale locale(String tag) {
        return tag == null || tag.isBlank() ? Locale.ENGLISH : Locale.forLanguageTag(tag);
    }
}
