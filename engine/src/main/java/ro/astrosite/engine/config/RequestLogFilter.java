package ro.astrosite.engine.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * Puts the caller's request id (X-Request-Id, sent by the web tier) into the logging context so every line
 * written while handling the request carries it, echoes it in the response, and logs one line per API call
 * with status and duration. Actuator traffic is not logged.
 */
@Component
public class RequestLogFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger("http");
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9._-]{1,64}");
    private static final SecureRandom random = new SecureRandom();

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String rid = req.getHeader("X-Request-Id");
        if (rid == null || !SAFE_ID.matcher(rid).matches()) rid = newId();
        MDC.put("rid", rid);
        res.setHeader("X-Request-Id", rid);
        long started = System.nanoTime();
        try {
            chain.doFilter(req, res);
        } finally {
            if (req.getRequestURI().startsWith("/api/")) {
                long ms = (System.nanoTime() - started) / 1_000_000;
                log.info("{} {} status={} ms={}", req.getMethod(), req.getRequestURI(), res.getStatus(), ms);
            }
            MDC.clear();
        }
    }

    private static String newId() {
        byte[] b = new byte[6];
        random.nextBytes(b);
        return HexFormat.of().formatHex(b);
    }
}
