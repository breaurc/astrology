package ro.astrosite.engine.ask;

/** The daily LLM token ceiling (astro.llm.daily-token-ceiling) has been reached. Mapped to HTTP 503. */
public class BudgetExceededException extends RuntimeException {
    public BudgetExceededException() { super("daily LLM token ceiling reached"); }
}
