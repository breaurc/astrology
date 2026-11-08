package ro.astrosite.engine.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * POST /api/chat: one conversation turn. The engine is stateless, so the caller sends the thread so far.
 *
 * @param history previous turns, oldest first; role is "user" or "assistant"
 */
public record ChatRequest(@NotNull @Valid BirthRequest birth,
                          LocalDate date,
                          String locale,
                          @Size(max = 60) List<@Valid ChatMessage> history,
                          @NotBlank @Size(max = 2000) String message) {

    public record ChatMessage(@NotBlank String role, @NotBlank @Size(max = 4000) String text) {}
}
