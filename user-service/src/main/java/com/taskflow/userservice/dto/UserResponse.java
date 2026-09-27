package com.taskflow.userservice.dto;

import com.taskflow.userservice.entity.User;

import java.time.Instant;

/** Public view of a user. Deliberately has no password field. */
public record UserResponse(Long id, String name, String email, Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }
}
