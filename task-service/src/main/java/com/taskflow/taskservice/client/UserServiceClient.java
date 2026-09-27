package com.taskflow.taskservice.client;

import com.taskflow.taskservice.exception.UserNotFoundException;
import com.taskflow.taskservice.exception.UserServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * HTTP client for user-service. task-service has no access to user data except through this API.
 */
@Component
public class UserServiceClient {

    private static final Logger log = LoggerFactory.getLogger(UserServiceClient.class);

    private final RestClient restClient;

    public UserServiceClient(RestClient userServiceRestClient) {
        this.restClient = userServiceRestClient;
    }

    /**
     * Calls GET /api/users/{id} on user-service.
     *
     * @throws UserNotFoundException           if user-service answers 404
     * @throws UserServiceUnavailableException if user-service is unreachable, times out or fails in any other way
     */
    public void verifyUserExists(Long userId) {
        log.info("Verifying user {} exists via user-service GET /api/users/{}", userId, userId);
        try {
            restClient.get()
                    .uri("/api/users/{id}", userId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.NotFound ex) {
            throw new UserNotFoundException(userId);
        } catch (ResourceAccessException ex) {
            log.warn("user-service unreachable while verifying user {}: {}", userId, ex.getMostSpecificCause().toString());
            throw new UserServiceUnavailableException(ex);
        } catch (RestClientException ex) {
            log.error("Unexpected error from user-service while verifying user {}", userId, ex);
            throw new UserServiceUnavailableException(ex);
        }
    }
}
