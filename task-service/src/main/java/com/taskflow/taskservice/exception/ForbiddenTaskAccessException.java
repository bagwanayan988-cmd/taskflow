package com.taskflow.taskservice.exception;

/** Thrown when a task exists but belongs to a different user than the one making the request. */
public class ForbiddenTaskAccessException extends RuntimeException {

    public ForbiddenTaskAccessException() {
        super("You do not have permission to access this task");
    }
}
