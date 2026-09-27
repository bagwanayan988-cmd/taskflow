package com.taskflow.userservice.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;

public class MaxBytesValidator implements ConstraintValidator<MaxBytes, String> {

    private int maxBytes;

    @Override
    public void initialize(MaxBytes annotation) {
        this.maxBytes = annotation.value();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // Null is left to @NotBlank, as with the built-in constraints.
        return value == null || value.getBytes(StandardCharsets.UTF_8).length <= maxBytes;
    }
}
