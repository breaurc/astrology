package ro.astrosite.engine.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import ro.astrosite.engine.reading.ReadingSystem;

import java.time.LocalDate;

/** POST /api/reading: the free landing-page reading for one system. */
public record ReadingRequest(@NotNull @Valid BirthRequest birth,
                             @NotNull ReadingSystem system,
                             LocalDate date,
                             String locale) {
}
