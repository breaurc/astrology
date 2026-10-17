package ro.astrosite.engine.astro;

public enum ZodiacSign {
    ARIES(Element.FIRE, Modality.CARDINAL),
    TAURUS(Element.EARTH, Modality.FIXED),
    GEMINI(Element.AIR, Modality.MUTABLE),
    CANCER(Element.WATER, Modality.CARDINAL),
    LEO(Element.FIRE, Modality.FIXED),
    VIRGO(Element.EARTH, Modality.MUTABLE),
    LIBRA(Element.AIR, Modality.CARDINAL),
    SCORPIO(Element.WATER, Modality.FIXED),
    SAGITTARIUS(Element.FIRE, Modality.MUTABLE),
    CAPRICORN(Element.EARTH, Modality.CARDINAL),
    AQUARIUS(Element.AIR, Modality.FIXED),
    PISCES(Element.WATER, Modality.MUTABLE);

    public enum Element { FIRE, EARTH, AIR, WATER }
    public enum Modality { CARDINAL, FIXED, MUTABLE }

    private final Element element;
    private final Modality modality;

    ZodiacSign(Element element, Modality modality) {
        this.element = element;
        this.modality = modality;
    }

    public Element element() { return element; }
    public Modality modality() { return modality; }

    /** Sign containing an ecliptic longitude (0..360). */
    public static ZodiacSign of(double longitude) {
        int idx = (int) Math.floor(Angles.norm360(longitude) / 30.0);
        return values()[Math.min(idx, 11)];
    }

    /** Degrees inside the sign, 0..30. */
    public static double degreeInSign(double longitude) {
        return Angles.norm360(longitude) % 30.0;
    }

    /** 0-based index of the sign, Aries = 0. */
    public int index() { return ordinal(); }
}
