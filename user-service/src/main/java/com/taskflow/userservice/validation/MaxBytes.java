package com.taskflow.userservice.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Limits a string's UTF-8 encoded length in bytes. {@code @Size} counts characters, which is not enough
 * where the real limit is in bytes (e.g. BCrypt's 72-byte input limit with emoji or non-Latin text).
 */
@Documented
@Constraint(validatedBy = MaxBytesValidator.class)
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface MaxBytes {

    int value();

    String message() default "must be at most {value} bytes";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
