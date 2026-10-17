package ro.astrosite.engine.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ro.astrosite.engine.astro.BirthData;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * Birth data as sent by the client.
 *
 * @param time null when unknown
 * @param zone IANA zone id, e.g. Europe/Bucharest
 */
public record BirthRequest(String name,
                           @NotNull LocalDate date,
                           LocalTime time,
                           @NotBlank String zone,
                           @NotNull @Min(-90) @Max(90) Double latitude,
                           @NotNull @Min(-180) @Max(180) Double longitude) {

    public BirthData toBirthData() {
        ZoneId.of(zone); // validates
        return new BirthData(name, date, time, zone, latitude, longitude);
    }
}
