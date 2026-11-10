package ro.astrosite.engine.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/** POST /api/sky: the day's planets over the natal chart, for the wheel drawing. No narration. */
public record SkyRequest(@NotNull @Valid BirthRequest birth, LocalDate date) {
}
