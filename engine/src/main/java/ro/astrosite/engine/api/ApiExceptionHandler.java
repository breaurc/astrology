package ro.astrosite.engine.api;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import ro.astrosite.engine.ask.BudgetExceededException;
import ro.astrosite.engine.ask.NarrationUnavailableException;

import java.time.DateTimeException;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    private final MeterRegistry meters;

    public ApiExceptionHandler(MeterRegistry meters) {
        this.meters = meters;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException e) {
        var errors = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage()).toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "validation", "details", errors));
    }

    @ExceptionHandler({DateTimeException.class, IllegalArgumentException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String, Object>> bad(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "bad_request", "details", String.valueOf(e.getMessage())));
    }

    /** Daily token ceiling reached: the caller shows a maintenance message (HLD section 6). */
    @ExceptionHandler(BudgetExceededException.class)
    public ResponseEntity<Map<String, Object>> budget(BudgetExceededException e) {
        meters.counter("api.unavailable", "cause", "budget").increment();
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", "budget", "details", e.getMessage()));
    }

    /** Model timeout or provider error: the caller shows a retry message and consumes no quota or credit. */
    @ExceptionHandler(NarrationUnavailableException.class)
    public ResponseEntity<Map<String, Object>> llm(NarrationUnavailableException e) {
        meters.counter("api.unavailable", "cause", "llm").increment();
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", "llm_unavailable", "details", e.getMessage()));
    }
}
