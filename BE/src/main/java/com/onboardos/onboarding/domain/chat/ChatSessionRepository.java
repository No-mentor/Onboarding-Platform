package com.onboardos.onboarding.domain.chat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    List<ChatSession> findByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(
            UUID workspaceId,
            UUID userId
    );

    Optional<ChatSession> findByIdAndWorkspaceIdAndUserIdAndDeletedAtIsNull(
            UUID id,
            UUID workspaceId,
            UUID userId
    );
}
