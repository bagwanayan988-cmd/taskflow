package com.taskflow.taskservice.service;

import com.taskflow.taskservice.client.UserServiceClient;
import com.taskflow.taskservice.dto.TaskRequest;
import com.taskflow.taskservice.dto.TaskResponse;
import com.taskflow.taskservice.entity.Task;
import com.taskflow.taskservice.entity.TaskStatus;
import com.taskflow.taskservice.exception.ForbiddenTaskAccessException;
import com.taskflow.taskservice.exception.TaskNotFoundException;
import com.taskflow.taskservice.repository.TaskRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Task use cases. Every method takes the id of the authenticated user and only ever reads or changes
 * that user's tasks, regardless of which task id the client asks for.
 */
@Service
public class TaskService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt");

    private final TaskRepository taskRepository;
    private final UserServiceClient userServiceClient;

    public TaskService(TaskRepository taskRepository, UserServiceClient userServiceClient) {
        this.taskRepository = taskRepository;
        this.userServiceClient = userServiceClient;
    }

    /**
     * Confirms with user-service that the user exists before saving; if that check throws, nothing is saved.
     * Deliberately not {@code @Transactional}: holding a DB connection open across a remote HTTP call would
     * tie up the pool whenever user-service is slow. {@code save} runs in its own transaction.
     */
    public TaskResponse createTask(TaskRequest request, Long userId) {
        userServiceClient.verifyUserExists(userId);
        TaskStatus status = request.status() != null ? request.status() : TaskStatus.TODO;
        Task task = new Task(request.title().trim(), normalizeDescription(request.description()), status, userId);
        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksForUser(Long userId) {
        return taskRepository.findByUserId(userId, NEWEST_FIRST).stream()
                .map(TaskResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long taskId, Long userId) {
        return TaskResponse.fromEntity(findOwnedTask(taskId, userId));
    }

    @Transactional
    public TaskResponse updateTask(Long taskId, TaskRequest request, Long userId) {
        Task task = findOwnedTask(taskId, userId);
        TaskStatus status = request.status() != null ? request.status() : task.getStatus();
        task.update(request.title().trim(), normalizeDescription(request.description()), status);
        // Flush now so @PreUpdate sets updatedAt before the response is built.
        return TaskResponse.fromEntity(taskRepository.saveAndFlush(task));
    }

    @Transactional
    public void deleteTask(Long taskId, Long userId) {
        taskRepository.delete(findOwnedTask(taskId, userId));
    }

    /**
     * Loads a task only if it belongs to {@code userId}: 404 if no such task exists, 403 if it exists but
     * is owned by someone else. The owner-scoped query runs first, so the common case is a single lookup.
     */
    private Task findOwnedTask(Long taskId, Long userId) {
        return taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> taskRepository.existsById(taskId)
                        ? new ForbiddenTaskAccessException()
                        : new TaskNotFoundException(taskId));
    }

    private static String normalizeDescription(String description) {
        return description == null || description.isBlank() ? null : description.trim();
    }
}
