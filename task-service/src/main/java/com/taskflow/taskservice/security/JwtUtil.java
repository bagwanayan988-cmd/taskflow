package com.taskflow.taskservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Validates JWTs issued by user-service. task-service never issues tokens, so there is deliberately
 * no generation method here.
 */
@Component
public class JwtUtil {

    private final JwtParser parser;

    public JwtUtil(JwtProperties properties) {
        // Throws WeakKeyException at startup if the secret is shorter than 256 bits.
        this.parser = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8)))
                .build();
    }

    /**
     * Verifies the signature and expiry and returns the user id from the subject.
     *
     * @throws io.jsonwebtoken.ExpiredJwtException if the token has expired
     * @throws io.jsonwebtoken.JwtException        if the token is malformed, unsigned or wrongly signed
     * @throws IllegalArgumentException            if the token is blank or its subject is not a user id
     */
    public Long extractUserId(String token) {
        Claims claims = parser.parseSignedClaims(token).getPayload();
        String subject = claims.getSubject();
        if (subject == null) {
            throw new IllegalArgumentException("Token has no subject");
        }
        return Long.valueOf(subject);
    }
}
