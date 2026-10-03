package com.taskflow.apigateway;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

/** A downstream service that can't be reached, or drops the connection, is reported as 502, not 500. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class DownstreamUnavailableHandlerTests {

    // Accepts connections, then closes each one without answering, like a service restarting mid-request.
    private static final ServerSocket droppingServer = startDroppingServer();

    @Autowired
    private WebTestClient webTestClient;

    @DynamicPropertySource
    static void routes(DynamicPropertyRegistry registry) {
        int closedPort = findClosedPort();
        registry.add("USER_SERVICE_URL", () -> "http://localhost:" + closedPort);
        registry.add("TASK_SERVICE_URL", () -> "http://localhost:" + droppingServer.getLocalPort());
    }

    @AfterAll
    static void stopDroppingServer() throws IOException {
        droppingServer.close();
    }

    @Test
    void connectionRefusedReturns502Json() {
        webTestClient.post().uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("{}")
                .exchange()
                .expectStatus().isEqualTo(502)
                .expectBody()
                .jsonPath("$.status").isEqualTo(502)
                .jsonPath("$.error").isEqualTo("Bad Gateway");
    }

    @Test
    void connectionClosedBeforeResponseReturns502() {
        webTestClient.get().uri("/api/tasks")
                .exchange()
                .expectStatus().isEqualTo(502);
    }

    private static int findClosedPort() {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static ServerSocket startDroppingServer() {
        try {
            ServerSocket server = new ServerSocket(0);
            Thread acceptor = new Thread(() -> {
                while (!server.isClosed()) {
                    try (Socket client = server.accept()) {
                        client.getInputStream().read();
                    } catch (IOException ignored) {
                        // Closing the connection without a response is the point.
                    }
                }
            });
            acceptor.setDaemon(true);
            acceptor.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
