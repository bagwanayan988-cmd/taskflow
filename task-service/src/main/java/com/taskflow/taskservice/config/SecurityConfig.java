package com.taskflow.taskservice.config;

import com.taskflow.taskservice.security.JsonSecurityErrorHandler;
import com.taskflow.taskservice.security.JwtAuthenticationFilter;
import com.taskflow.taskservice.security.JwtUtil;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.h2.H2ConsoleProperties;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtUtil jwtUtil,
                                                   JsonSecurityErrorHandler securityErrorHandler,
                                                   ObjectProvider<H2ConsoleProperties> h2Console) throws Exception {
        return http
                // Stateless JWT API: no session cookies, so CSRF protection does not apply.
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // The H2 console renders inside same-origin frames.
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                .authorizeHttpRequests(auth -> {
                    // Only when the console is enabled: PathRequest.toH2Console() needs its properties bean,
                    // which doesn't exist when it is switched off (H2_CONSOLE_ENABLED=false in deployments).
                    if (h2Console.getIfAvailable() != null) {
                        auth.requestMatchers(PathRequest.toH2Console()).permitAll();
                    }
                    auth.requestMatchers("/api/tasks/**").authenticated()
                            .anyRequest().authenticated();
                })
                .addFilterBefore(new JwtAuthenticationFilter(jwtUtil), UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler))
                .build();
    }
}
