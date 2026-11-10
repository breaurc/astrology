package ro.astrosite.engine;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** The funnel endpoints: /api/reading, /api/calendar, /api/chat (template narration, no API key in tests). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "astro.llm.api-key=")
class ReadingApiTest {

    @Autowired
    TestRestTemplate rest;

    private static final Map<String, Object> BIRTH = Map.of(
            "name", "Ana Maria Pop", "date", "1991-03-12", "time", "08:40",
            "zone", "Europe/Bucharest", "latitude", 47.16, "longitude", 27.59);

    @Test
    @SuppressWarnings("unchecked")
    void westernReadingHasFactsAndFourLineText() {
        Map<String, Object> req = Map.of("birth", BIRTH, "system", "WESTERN", "date", "2026-11-07", "locale", "en");
        ResponseEntity<Map> r = rest.postForEntity("/api/reading", req, Map.class);
        assertEquals(200, r.getStatusCode().value());
        Map<String, Object> body = r.getBody();
        assertEquals("WESTERN", body.get("system"));
        Map<String, Object> facts = (Map<String, Object>) body.get("facts");
        assertEquals("PISCES", facts.get("sunSign"));
        assertNotNull(facts.get("risingSign"));
        assertNotNull(facts.get("transitMoonSign"));
        assertEquals("template", body.get("narrator"));
        assertTrue(body.get("text").toString().length() > 60);
        assertTrue((Integer) body.get("score") >= 1 && (Integer) body.get("score") <= 10);
    }

    @Test
    @SuppressWarnings("unchecked")
    void chineseAndNumerologyReadingsInRomanian() {
        Map<String, Object> ch = rest.postForEntity("/api/reading",
                Map.of("birth", BIRTH, "system", "CHINESE", "date", "2026-11-07", "locale", "ro"), Map.class).getBody();
        Map<String, Object> cf = (Map<String, Object>) ch.get("facts");
        assertEquals("GOAT", cf.get("animal"));
        assertNotNull(cf.get("dayAnimal"));
        assertTrue(ch.get("text").toString().contains("horoscopul chinezesc"));

        Map<String, Object> nu = rest.postForEntity("/api/reading",
                Map.of("birth", BIRTH, "system", "NUMEROLOGY", "date", "2026-11-07", "locale", "ro"), Map.class).getBody();
        Map<String, Object> nf = (Map<String, Object>) nu.get("facts");
        assertEquals(8, nf.get("lifePath"));          // 1991-03-12 → 1+9+9+1 + 3 + 1+2 = 26 → 8
        assertNotNull(nf.get("expression"));          // name given
        assertNotNull(nf.get("personalDay"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void calendarReturnsSevenDaysWithVerdicts() {
        Map<String, Object> req = Map.of("birth", BIRTH, "from", "2026-11-07", "days", 7, "locale", "en");
        ResponseEntity<Map> r = rest.postForEntity("/api/calendar", req, Map.class);
        assertEquals(200, r.getStatusCode().value());
        List<Map<String, Object>> days = (List<Map<String, Object>>) r.getBody().get("days");
        assertEquals(7, days.size());
        assertEquals("2026-11-07", days.get(0).get("date"));
        assertEquals("2026-11-13", days.get(6).get("date"));
        for (Map<String, Object> d : days) {
            assertTrue(List.of("GOOD", "MIXED", "CAUTION").contains(d.get("verdict")));
            assertNotNull(d.get("good"));
            assertNotNull(d.get("avoid"));
            assertEquals(8, ((Map<?, ?>) d.get("scores")).size());
        }
    }

    @Test
    void chatAnswersAboutTheDayAndRefusesOffTopic() {
        Map<String, Object> turn = Map.of("birth", BIRTH, "date", "2026-11-07", "locale", "en",
                "history", List.of(Map.of("role", "user", "text", "Hi"), Map.of("role", "assistant", "text", "Hello")),
                "message", "Should I go to the job interview today?");
        ResponseEntity<Map> r = rest.postForEntity("/api/chat", turn, Map.class);
        assertEquals(200, r.getStatusCode().value());
        assertEquals("CAREER", r.getBody().get("category"));
        assertEquals("NONE", r.getBody().get("guardrail"));
        assertTrue(r.getBody().get("text").toString().contains("/10"));

        Map<String, Object> off = Map.of("birth", BIRTH, "locale", "en", "message", "Write code in python to sort a list");
        ResponseEntity<Map> o = rest.postForEntity("/api/chat", off, Map.class);
        assertEquals("OFF_TOPIC", o.getBody().get("guardrail"));
        assertEquals("guardrail", o.getBody().get("narrator"));

        ResponseEntity<Map> bad = rest.postForEntity("/api/chat", Map.of("birth", BIRTH, "message", ""), Map.class);
        assertEquals(400, bad.getStatusCode().value());
    }

    @Test
    @SuppressWarnings("unchecked")
    void requestIdIsEchoedAndNarrationCountersAreExposed() {
        HttpHeaders h = new HttpHeaders();
        h.set("X-Request-Id", "8a1b2c3d4e5f-FRA");
        Map<String, Object> req = Map.of("birth", BIRTH, "system", "WESTERN", "date", "2026-11-07", "locale", "en");
        ResponseEntity<Map> r = rest.postForEntity("/api/reading", new HttpEntity<>(req, h), Map.class);
        assertEquals(200, r.getStatusCode().value());
        assertEquals("8a1b2c3d4e5f-FRA", r.getHeaders().getFirst("X-Request-Id"));

        ResponseEntity<Map> noId = rest.postForEntity("/api/reading", req, Map.class);
        assertTrue(noId.getHeaders().getFirst("X-Request-Id").matches("[0-9a-f]{12}"));

        ResponseEntity<Map> m = rest.getForEntity("/actuator/metrics/narration.calls?tag=mode:reading", Map.class);
        assertEquals(200, m.getStatusCode().value());
        List<Map<String, Object>> measurements = (List<Map<String, Object>>) m.getBody().get("measurements");
        assertTrue(((Number) measurements.get(0).get("value")).doubleValue() >= 1);
    }

    @Test
    @SuppressWarnings("unchecked")
    void skyCarriesBothChartsAndTheAspectsBehindTheWesternReading() {
        Map<String, Object> sky = rest.postForEntity("/api/sky", Map.of("birth", BIRTH, "date", "2026-11-07"), Map.class).getBody();
        assertEquals("2026-11-07", sky.get("date"));
        assertEquals(true, sky.get("timeKnown"));
        assertNotNull(sky.get("ascendant"));
        assertEquals(12, ((List<?>) sky.get("houseCusps")).size());
        List<Map<String, Object>> natal = (List<Map<String, Object>>) sky.get("natal");
        List<Map<String, Object>> transit = (List<Map<String, Object>>) sky.get("transit");
        assertEquals(10, natal.size());
        assertEquals(10, transit.size());
        Map<String, Object> sun = natal.stream().filter(p -> p.get("body").equals("SUN")).findFirst().orElseThrow();
        assertEquals("PISCES", sun.get("sign"));
        assertTrue((Integer) sun.get("house") >= 1 && (Integer) sun.get("house") <= 12);
        List<Map<String, Object>> aspects = (List<Map<String, Object>>) sky.get("aspects");
        assertFalse(aspects.isEmpty());
        for (Map<String, Object> a : aspects) {
            assertNotNull(a.get("transit"));
            assertNotNull(a.get("natal"));
            assertTrue(List.of("CONJUNCTION", "SEXTILE", "SQUARE", "TRINE", "OPPOSITION").contains(a.get("aspect")));
            assertTrue(((Number) a.get("orb")).doubleValue() <= 3.0);
            assertTrue(List.of(-1, 0, 1).contains(a.get("nature")));
        }

        // the western reading carries the same sky, the other systems none
        Map<String, Object> western = rest.postForEntity("/api/reading",
                Map.of("birth", BIRTH, "system", "WESTERN", "date", "2026-11-07", "locale", "en"), Map.class).getBody();
        assertEquals(aspects, ((Map<String, Object>) western.get("sky")).get("aspects"));
        Map<String, Object> numerology = rest.postForEntity("/api/reading",
                Map.of("birth", BIRTH, "system", "NUMEROLOGY", "date", "2026-11-07", "locale", "en"), Map.class).getBody();
        assertNull(numerology.get("sky"));

        // unknown birth time: no angles, no houses; the wheel starts at 0 Aries
        Map<String, Object> noTime = new HashMap<>(BIRTH);
        noTime.remove("time");
        Map<String, Object> flat = rest.postForEntity("/api/sky", Map.of("birth", noTime, "date", "2026-11-07"), Map.class).getBody();
        assertEquals(false, flat.get("timeKnown"));
        assertNull(flat.get("ascendant"));
        assertTrue(((List<?>) flat.get("houseCusps")).isEmpty());
        assertEquals(0, ((List<Map<String, Object>>) flat.get("natal")).get(0).get("house"));
    }
}
