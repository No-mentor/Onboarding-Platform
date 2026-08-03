package com.onboardos.onboarding.auth;

import com.onboardos.onboarding.auth.dto.AuthResponse;
import com.onboardos.onboarding.auth.dto.LoginRequest;
import com.onboardos.onboarding.auth.dto.MeResponse;
import com.onboardos.onboarding.auth.dto.SignupRequest;
import com.onboardos.onboarding.global.security.SecurityUtils;
import com.onboardos.onboarding.global.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auth")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "회원가입")
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @Operation(summary = "로그인")
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @Operation(summary = "내 정보")
    @GetMapping("/me")
    public MeResponse me(
            @RequestHeader(value = "X-Workspace-Id", required = false) UUID workspaceId
    ) {
        UserPrincipal principal = SecurityUtils.currentUser();
        return authService.me(principal, workspaceId);
    }

    @Operation(summary = "로그아웃 (클라이언트 토큰 폐기 유도)")
    @PostMapping("/logout")
    public MapResponse logout() {
        return new MapResponse(true);
    }

    public record MapResponse(boolean success) {
    }
}
