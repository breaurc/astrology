package ro.astrosite.engine.reading;

import ro.astrosite.engine.scoring.Factor;

/** The three systems a visitor can pick on the landing page (SPEC section 3.1). */
public enum ReadingSystem {
    WESTERN(Factor.Source.WESTERN),
    CHINESE(Factor.Source.CHINESE),
    NUMEROLOGY(Factor.Source.NUMEROLOGY);

    private final Factor.Source source;

    ReadingSystem(Factor.Source source) { this.source = source; }

    public Factor.Source source() { return source; }
}
