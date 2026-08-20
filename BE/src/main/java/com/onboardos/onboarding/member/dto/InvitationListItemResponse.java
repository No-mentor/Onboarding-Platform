package com.onboardos.onboarding.member.dto;

import com.onboardos.onboarding.domain.invitation.InvitationStatus;
import com.onboardos.onboarding.domain.user.UserRole;
import java.time.Instant;
import java.util.UUID;

/**
 * 워크스페이스의 초대 목록 한 줄.
 * 토큰은 초대 링크 그 자체이므로 목록에는 절대 담지 않는다.
 */
public record InvitationListItemResponse(
        UUID invitationId,
        String email,
        UserRole role,
        String department,
        String careerLevel,
        String title,
        InvitationStatus status,
        /** status 가 PENDING 이어도 기한이 지났으면 true. 화면에서 "만료" 로 보여 주기 위한 것 */
        boolean expired,
        String inviterName,
        Instant expiresAt,
        Instant createdAt
) {
}
