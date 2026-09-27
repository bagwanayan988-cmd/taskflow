package com.taskflow.taskservice.exception;

public class UserServiceUnavailableException extends RuntimeException {

    public UserServiceUnavailableException(Throwable cause) {
        super("User service is currently unavailable. Please try again later.", cause);
    }
}
