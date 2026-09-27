package com.taskflow.taskservice.dto;

import com.taskflow.taskservice.entity.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload for creating and updating a task. {@code status} is optional: a new task defaults to TODO,
 * and an update without a status keeps the current one.
 */
public record TaskRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must be at most 200 characters")
        String title,

        @Size(max = 2000, message = "Description must be at most 2000 characters")
        String description,

        TaskStatus status
) {
}
