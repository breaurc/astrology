package ro.astrosite.engine.numerology;

/**
 * Pythagorean numerology profile. Master numbers 11, 22 and 33 are kept unreduced.
 *
 * @param lifePath     from the full birth date
 * @param birthday     day of the month, reduced
 * @param expression   from the full name (null when no name)
 * @param soulUrge     from the vowels of the name (null when no name)
 * @param personality  from the consonants of the name (null when no name)
 * @param personalYear for the reference date
 * @param personalMonth for the reference date
 * @param personalDay  for the reference date
 */
public record NumerologyProfile(int lifePath, int birthday, Integer expression, Integer soulUrge,
                                Integer personality, int personalYear, int personalMonth, int personalDay) {
}
