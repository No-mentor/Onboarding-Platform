package com.onboardos.onboarding.domain.invitation;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvitationRepository extends JpaRepository<Invitation, UUID> {

    Optional<Invitation> findByToken(String token);

    boolean existsByWorkspaceIdAndEmailAndStatus(UUID workspaceId, String email, InvitationStatus status);

    /** 같은 주소로 다시 초대할 때, 남아 있는 PENDING 초대가 이미 만료됐는지 확인하기 위해 꺼낸다 */
    Optional<Invitation> findByWorkspaceIdAndEmailAndStatus(
            UUID workspaceId, String email, InvitationStatus status);

    Page<Invitation> findByWorkspaceId(UUID workspaceId, Pageable pageable);

    Page<Invitation> findByWorkspaceIdAndStatus(
            UUID workspaceId, InvitationStatus status, Pageable pageable);
}
