package com.taskflow.taskservice.repository;

import com.taskflow.taskservice.entity.Task;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByUserId(Long userId, Sort sort);

    Optional<Task> findByIdAndUserId(Long id, Long userId);
}
