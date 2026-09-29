package com.taskflow.userservice.config;

import com.taskflow.userservice.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Makes user ids unique across database resets.
 * <p>
 * On hosts with ephemeral disks (e.g. Render's free tier) the H2 file is wiped whenever the service restarts,
 * and ids would start again at 1. A JWT issued before the reset is still validly signed, so it would suddenly
 * identify whoever registers next as user 1 and expose that person's tasks. Starting an empty table's id
 * sequence at the current epoch millisecond means an id is never handed out twice.
 * <p>
 * Runs during startup, before the web server accepts requests.
 */
@Component
public class UserIdSequenceInitializer {

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public UserIdSequenceInitializer(UserRepository userRepository, JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    void startIdsAtCurrentTimeIfEmpty() {
        if (userRepository.count() == 0) {
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN id RESTART WITH " + System.currentTimeMillis());
        }
    }
}
