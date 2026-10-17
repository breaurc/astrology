package ro.astrosite.engine.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import ro.astrosite.engine.scoring.Category;

import java.time.LocalDate;

public record BestDaysRequest(@NotNull @Valid BirthRequest birth,
                              @NotNull Category category,
                              LocalDate from,
                              @Min(1) @Max(90) Integer days,
                              @Min(1) @Max(30) Integer limit,
                              String locale) {
}
