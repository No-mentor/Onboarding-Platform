package com.onboardos.onboarding.domain.chat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Table(name = "chat_messages")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

    @Id
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 20)
    private String role;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<Map<String, Object>> citations = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "permission_denied_document_ids", nullable = false, columnDefinition = "jsonb")
    private List<String> permissionDeniedDocumentIds = new ArrayList<>();

    private String model;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public static ChatMessage user(UUID sessionId, UUID workspaceId, UUID userId, String content) {
        ChatMessage m = base(sessionId, workspaceId, userId, "user", content);
        m.citations = List.of();
        m.permissionDeniedDocumentIds = List.of();
        return m;
    }

    public static ChatMessage assistant(
            UUID sessionId,
            UUID workspaceId,
            UUID userId,
            String content,
            List<Map<String, Object>> citations,
            List<String> deniedIds,
            String model
    ) {
        ChatMessage m = base(sessionId, workspaceId, userId, "assistant", content);
        m.citations = citations == null ? List.of() : citations;
        m.permissionDeniedDocumentIds = deniedIds == null ? List.of() : deniedIds;
        m.model = model;
        return m;
    }

    private static ChatMessage base(UUID sessionId, UUID workspaceId, UUID userId, String role, String content) {
        ChatMessage m = new ChatMessage();
        m.id = UUID.randomUUID();
        m.sessionId = sessionId;
        m.workspaceId = workspaceId;
        m.userId = userId;
        m.role = role;
        m.content = content;
        m.createdAt = Instant.now();
        return m;
    }
}
