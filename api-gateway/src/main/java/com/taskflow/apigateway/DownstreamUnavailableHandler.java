package com.taskflow.apigateway;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebExceptionHandler;

import reactor.core.publisher.Mono;

/**
 * When the gateway cannot get a response from a downstream service (connection refused or reset, DNS
 * failure, connection closed mid-request, e.g. while a sleeping service boots), answer 502 Bad Gateway
 * instead of Spring's default 500. A 5xx from the gateway should say "the service behind me failed",
 * which also lets clients tell a temporary outage apart from a real server error and retry.
 * Runs before Spring Boot's default error handler (order -1).
 */
@Component
@Order(-2)
class DownstreamUnavailableHandler implements WebExceptionHandler {

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();
        if (!isNetworkFailure(ex) || response.isCommitted()) {
            return Mono.error(ex);
        }
        response.setStatusCode(HttpStatus.BAD_GATEWAY);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = """
                {"status":502,"error":"Bad Gateway","message":"The service is unavailable right now. Please try again.","timestamp":"%s"}"""
                .formatted(Instant.now());
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    private static boolean isNetworkFailure(Throwable ex) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause instanceof IOException) {
                return true;
            }
        }
        return false;
    }
}
