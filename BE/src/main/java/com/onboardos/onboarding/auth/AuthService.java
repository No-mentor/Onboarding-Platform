package com.onboardos.onboarding.auth;

import com.onboardos.onboarding.auth.dto.AuthResponse;
import com.onboardos.onboarding.auth.dto.LoginRequest;
import com.onboardos.onboarding.auth.dto.MeResponse;
import com.onboardos.onboarding.auth.dto.SignupRequest;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import com.onboardos.onboarding.domain.workspace.Workspace;
import com.onboardos.onboarding.domain.workspace.WorkspaceRepository;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.JwtTokenProvider;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.workspace.dto.WorkspaceSummaryResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final WorkspaceRepository workspaceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailAndDeletedAtIsNull(email)) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 가입된 이메일입니다.");
        }

        User user = User.create(email, request.name(), passwordEncoder.encode(request.password()));
        userRepository.save(user);

        String token = jwtTokenProvider.createAccessToken(user.getId(), user.getEmail());
        return AuthResponse.of(
                user.getId(),
                user.getEmail(),
                user.getName(),
                token,
                jwtTokenProvider.getExpirationSeconds(),
                List.of()
        );
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "비활성화된 계정입니다.");
        }

        user.markLogin();
        String token = jwtTokenProvider.createAccessToken(user.getId(), user.getEmail());
        return AuthResponse.of(
                user.getId(),
                user.getEmail(),
                user.getName(),
                token,
                jwtTokenProvider.getExpirationSeconds(),
                listWorkspaces(user.getId())
        );
    }

    @Transactional(readOnly = true)
    public MeResponse me(UserPrincipal principal, UUID workspaceIdHeader) {
        User user = userRepository.findById(principal.getId())
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

        List<WorkspaceSummaryResponse> workspaces = listWorkspaces(user.getId());
        WorkspaceSummaryResponse current = null;
        if (workspaceIdHeader != null) {
            current = workspaces.stream()
                    .filter(w -> w.id().equals(workspaceIdHeader))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(ErrorCode.WORKSPACE_MISMATCH));
        } else if (!workspaces.isEmpty()) {
            current = workspaces.get(0);
        }

        return new MeResponse(user.getId(), user.getEmail(), user.getName(), current, workspaces);
    }

    private List<WorkspaceSummaryResponse> listWorkspaces(UUID userId) {
        List<Membership> memberships = membershipRepository.findByUserIdAndDeletedAtIsNull(userId).stream()
                .filter(Membership::isActive)
                .toList();
        if (memberships.isEmpty()) {
            return List.of();
        }

        Map<UUID, Workspace> workspaceMap = workspaceRepository.findAllById(
                memberships.stream().map(Membership::getWorkspaceId).toList()
        ).stream()
                .filter(w -> w.getDeletedAt() == null)
                .collect(Collectors.toMap(Workspace::getId, Function.identity()));

        return memberships.stream()
                .filter(m -> workspaceMap.containsKey(m.getWorkspaceId()))
                .map(m -> {
                    Workspace ws = workspaceMap.get(m.getWorkspaceId());
                    return new WorkspaceSummaryResponse(ws.getId(), ws.getName(), ws.getSlug(), m.getRole());
                })
                .toList();
    }
}
