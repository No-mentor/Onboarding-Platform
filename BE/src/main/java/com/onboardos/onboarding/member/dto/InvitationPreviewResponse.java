package com.onboardos.onboarding.member.dto;

import com.onboardos.onboarding.domain.invitation.InvitationStatus;
import com.onboardos.onboarding.domain.user.UserRole;
import java.time.Instant;

/**
 * 초대 링크를 연 사람에게 로그인 전에 보여 줄 정보.
 * 토큰 자체가 인증 수단이므로 인증 없이 조회할 수 있고, 그래서 토큰은 응답에 담지 않는다.
 */
public record InvitationPreviewResponse(
        String email,
        String workspaceName,
        String inviterName,
        UserRole role,
        String department,
        String title,
        Instant expiresAt,
        InvitationStatus status,
        /** 수락 가능한 상태인지. false 면 acceptBlockedReason 에 이유가 담긴다 */
        boolean acceptable,
        String acceptBlockedReason
) {
}
