package ro.astrosite.engine;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiSmokeTest {

    @Autowired
    TestRestTemplate rest;

    private static final Map<String, Object> BIRTH = Map.of(
            "name", "Test Person", "date", "1985-03-20", "time", "14:30",
            "zone", "Europe/Bucharest", "latitude", 47.16, "longitude", 27.59);

    @Test
    void chartEndpoint() {
        ResponseEntity<Map> r = rest.postForEntity("/api/chart", BIRTH, Map.class);
        assertEquals(200, r.getStatusCode().value());
        assertEquals("PISCES", r.getBody().get("sunSign"));
        assertNotNull(r.getBody().get("risingSign"));
    }

    @Test
    void askEndpointAnswersInRomanian() {
        Map<String, Object> req = Map.of("birth", BIRTH, "question", "E o zi bună să cunosc o persoană nouă?",
                "date", "2026-10-17", "locale", "ro");
        ResponseEntity<Map> r = rest.postForEntity("/api/ask", req, Map.class);
        assertEquals(200, r.getStatusCode().value());
        Map body = r.getBody();
        assertEquals("LOVE", body.get("category"));
        assertTrue((Integer) body.get("score") >= 1);
        assertTrue(body.get("text").toString().contains("/10"));
        assertFalse(((List<?>) body.get("reasons")).isEmpty());
    }

    @Test
    void distressIsHandledWithoutAstrology() {
        Map<String, Object> req = Map.of("birth", BIRTH, "question", "I want to die", "locale", "en");
        ResponseEntity<Map> r = rest.postForEntity("/api/ask", req, Map.class);
        assertEquals("DISTRESS", r.getBody().get("guardrail"));
        assertTrue(((List<?>) r.getBody().get("reasons")).isEmpty());
    }

    @Test
    void bestDaysReturnsSortedList() {
        Map<String, Object> req = Map.of("birth", BIRTH, "category", "LOVE", "from", "2026-10-17",
                "days", 14, "limit", 3, "locale", "en");
        ResponseEntity<List> r = rest.postForEntity("/api/best-days", req, List.class);
        assertEquals(200, r.getStatusCode().value());
        assertEquals(3, r.getBody().size());
    }

    @Test
    void validationErrors() {
        ResponseEntity<Map> r = rest.postForEntity("/api/chart", Map.of("name", "x"), Map.class);
        assertEquals(400, r.getStatusCode().value());
    }
}
