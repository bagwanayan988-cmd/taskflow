package com.taskflow.taskservice.exception;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(Long userId) {
        super("Cannot create a task for user " + userId + " because that user does not exist");
    }
}
