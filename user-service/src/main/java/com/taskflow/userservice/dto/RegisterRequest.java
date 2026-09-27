package com.taskflow.userservice.dto;

import com.taskflow.userservice.validation.MaxBytes;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must be at most 100 characters")
        String name,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        @Size(max = 255, message = "Email must be at most 255 characters")
        String email,

        // BCrypt accepts at most 72 bytes of input. The limit is in bytes, not characters, so a short
        // password made of multi-byte characters (emoji, non-Latin scripts) can still exceed it.
        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        @MaxBytes(value = 72, message = "Password is too long (maximum 72 bytes; emoji and non-Latin letters count as more than one)")
        String password
) {
}
