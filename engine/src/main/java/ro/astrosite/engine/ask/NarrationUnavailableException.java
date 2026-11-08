package ro.astrosite.engine.ask;

/**
 * The LLM is configured but did not answer (timeout, provider error). Mapped to HTTP 503 so the caller
 * can show a retry message without consuming the user's quota or credit (HLD section 6).
 */
public class NarrationUnavailableException extends RuntimeException {
    public NarrationUnavailableException(Throwable cause) { super("LLM narration unavailable", cause); }
}
