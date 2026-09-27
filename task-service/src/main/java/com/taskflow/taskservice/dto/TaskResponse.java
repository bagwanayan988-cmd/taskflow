package com.taskflow.taskservice.dto;

import com.taskflow.taskservice.entity.Task;
import com.taskflow.taskservice.entity.TaskStatus;

import java.time.Instant;

public record TaskResponse(Long id, String title, String description, TaskStatus status, Long userId,
                           Instant createdAt, Instant updatedAt) {

    public static TaskResponse fromEntity(Task task) {
        return new TaskResponse(task.getId(), task.getTitle(), task.getDescription(), task.getStatus(),
                task.getUserId(), task.getCreatedAt(), task.getUpdatedAt());
    }
}
