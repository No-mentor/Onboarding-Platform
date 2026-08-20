package com.onboardos.onboarding.domain.chat;

import com.onboardos.onboarding.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "chat_sessions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatSession extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(length = 200)
    private String title;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public static ChatSession create(UUID workspaceId, UUID userId, String title) {
        ChatSession s = new ChatSession();
        s.id = UUID.randomUUID();
        s.workspaceId = workspaceId;
        s.userId = userId;
        s.title = title;
        return s;
    }

    public void touchTitle(String title) {
        if (this.title == null || this.title.isBlank()) {
            this.title = title;
        }
    }
}
