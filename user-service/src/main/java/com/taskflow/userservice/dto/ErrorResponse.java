package com.taskflow.userservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import java.time.Instant;
import java.util.Map;

/**
 * Uniform error body for every failed request. {@code fieldErrors} is only present for validation failures.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErrorResponse(int status, String error, String message, Instant timestamp,
                            Map<String, String> fieldErrors) {

    public static ErrorResponse of(HttpStatusCode status, String message) {
        return of(status, message, Map.of());
    }

    public static ErrorResponse of(HttpStatusCode status, String message, Map<String, String> fieldErrors) {
        HttpStatus resolved = HttpStatus.resolve(status.value());
        String error = resolved != null ? resolved.getReasonPhrase() : "Error";
        return new ErrorResponse(status.value(), error, message, Instant.now(), fieldErrors);
    }
}
