package com.taskflow.taskservice.exception;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import com.taskflow.taskservice.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Translates every exception into an {@link ErrorResponse}. Extending {@link ResponseEntityExceptionHandler}
 * covers Spring MVC's own errors (malformed JSON, wrong HTTP method, unknown path, missing header, bad path
 * variable type) so they share the same JSON shape as the domain errors.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(TaskNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTaskNotFound(TaskNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ForbiddenTaskAccessException.class)
    public ResponseEntity<ErrorResponse> handleForbiddenTaskAccess(ForbiddenTaskAccessException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    /** The token is valid but its user no longer exists in user-service: the request cannot be fulfilled. */
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    /** The underlying cause is logged by UserServiceClient; the client only gets a generic message. */
    @ExceptionHandler(UserServiceUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleUserServiceUnavailable(UserServiceUnavailableException ex) {
        return build(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    }

    /** Last resort: log the full stack trace server-side, but only ever return a generic message. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage());
        }
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(HttpStatus.BAD_REQUEST, "Validation failed", fieldErrors));
    }

    /**
     * Distinguishes a missing body, broken JSON, and a field of the wrong type. An unknown enum value
     * (e.g. "status": "DONE") becomes a field error listing the allowed values.
     */
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        Throwable cause = ex.getCause();
        if (cause instanceof MismatchedInputException mismatch && !mismatch.getPath().isEmpty()
                && mismatch.getPath().get(mismatch.getPath().size() - 1).getFieldName() != null) {
            String field = mismatch.getPath().get(mismatch.getPath().size() - 1).getFieldName();
            Class<?> targetType = mismatch.getTargetType();
            String problem = mismatch instanceof InvalidFormatException && targetType != null && targetType.isEnum()
                    ? "Must be one of " + Arrays.toString(targetType.getEnumConstants())
                    : "Has an invalid value or type";
            return ResponseEntity.badRequest().body(ErrorResponse.of(HttpStatus.BAD_REQUEST, "Validation failed",
                    Map.of(field, problem)));
        }
        String message = cause instanceof JsonProcessingException
                ? "Request body is not valid JSON"
                : "Request body is missing or unreadable";
        return ResponseEntity.badRequest().body(ErrorResponse.of(HttpStatus.BAD_REQUEST, message));
    }

    /** e.g. GET /api/tasks/abc: say which parameter was wrong and what was expected. */
    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex, HttpHeaders headers,
                                                        HttpStatusCode status, WebRequest request) {
        String name = ex instanceof MethodArgumentTypeMismatchException argument ? argument.getName() : ex.getPropertyName();
        Class<?> requiredType = ex.getRequiredType();
        String expected = requiredType != null && Number.class.isAssignableFrom(requiredType) ? "a number" : "a valid value";
        String message = "'" + ex.getValue() + "' is not a valid value for '" + name + "'; expected " + expected;
        return ResponseEntity.badRequest().body(ErrorResponse.of(HttpStatus.BAD_REQUEST, message));
    }

    /** Spring's default ("No static resource ...") is misleading for an API and names framework internals. */
    @Override
    protected ResponseEntity<Object> handleNoResourceFoundException(NoResourceFoundException ex, HttpHeaders headers,
                                                                    HttpStatusCode status, WebRequest request) {
        String message = "No endpoint " + ex.getHttpMethod() + " /" + ex.getResourcePath();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of(HttpStatus.NOT_FOUND, message));
    }

    /** Funnels all other Spring MVC exceptions into our body; ProblemDetail's detail text is safe to expose. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
                                                             HttpStatusCode statusCode, WebRequest request) {
        // Most Spring MVC exceptions arrive with a null body and carry their ProblemDetail themselves.
        ProblemDetail problem = body instanceof ProblemDetail detail ? detail
                : ex instanceof org.springframework.web.ErrorResponse errorResponse ? errorResponse.getBody()
                : null;
        String message = problem != null && problem.getDetail() != null
                ? problem.getDetail()
                : "The request could not be processed";
        return ResponseEntity.status(statusCode).headers(headers).body(ErrorResponse.of(statusCode, message));
    }

    private static ResponseEntity<ErrorResponse> build(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ErrorResponse.of(status, message));
    }
}
