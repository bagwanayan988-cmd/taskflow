package com.taskflow.taskservice.controller;

import com.taskflow.taskservice.dto.TaskRequest;
import com.taskflow.taskservice.dto.TaskResponse;
import com.taskflow.taskservice.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

/**
 * The caller's user id always comes from the verified JWT (see JwtAuthenticationFilter), never from the
 * request itself, so a client cannot act on another user's behalf.
 */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@AuthenticationPrincipal Long userId,
                                                   @Valid @RequestBody TaskRequest request) {
        TaskResponse task = taskService.createTask(request, userId);
        return ResponseEntity.created(URI.create("/api/tasks/" + task.id())).body(task);
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getTasks(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(taskService.getTasksForUser(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTask(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTaskById(id, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(@AuthenticationPrincipal Long userId, @PathVariable Long id,
                                                   @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.updateTask(id, request, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        taskService.deleteTask(id, userId);
        return ResponseEntity.noContent().build();
    }
}
