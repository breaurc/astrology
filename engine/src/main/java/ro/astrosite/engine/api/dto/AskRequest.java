package ro.astrosite.engine.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record AskRequest(@NotNull @Valid BirthRequest birth,
                         @NotBlank @Size(max = 300) String question,
                         LocalDate date,
                         String locale) {
}
