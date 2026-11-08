package ro.astrosite.engine.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/** POST /api/calendar: day verdicts with good/avoid lists, no LLM. */
public record CalendarRequest(@NotNull @Valid BirthRequest birth,
                              LocalDate from,
                              @Min(1) @Max(31) Integer days,
                              String locale) {
}
