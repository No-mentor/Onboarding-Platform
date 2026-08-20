package com.onboardos.onboarding.global.security;

import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.exception.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final JsonMapper jsonMapper;

    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authException
    ) throws IOException {
        write(response, ErrorCode.UNAUTHORIZED, request.getRequestURI());
    }

    public void write(HttpServletResponse response, ErrorCode code, String path) throws IOException {
        response.setStatus(code.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(code.getStatus().value())
                .error(code.getStatus().getReasonPhrase())
                .code(code.getCode())
                .message(code.getDefaultMessage())
                .path(path)
                .traceId(UUID.randomUUID().toString().substring(0, 8))
                .build();

        jsonMapper.writeValue(response.getOutputStream(), body);
    }
}