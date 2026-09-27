package com.taskflow.userservice.exception;

public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        // Intentionally vague: never reveal whether the email or the password was wrong.
        super("Invalid email or password");
    }
}
