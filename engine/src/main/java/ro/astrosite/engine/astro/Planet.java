package ro.astrosite.engine.astro;

public enum Planet {
    SUN, MOON, MERCURY, VENUS, MARS, JUPITER, SATURN, URANUS, NEPTUNE, PLUTO;

    public boolean isLuminary() { return this == SUN || this == MOON; }

    /** Default orb (degrees) used for aspects involving this body as the slower/outer one. */
    public double transitOrb() {
        return switch (this) {
            case MOON -> 3.0;
            case SUN, MERCURY, VENUS, MARS -> 1.5;
            case JUPITER, SATURN -> 2.0;
            case URANUS, NEPTUNE, PLUTO -> 1.0;
        };
    }
}
