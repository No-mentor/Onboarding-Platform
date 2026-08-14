package com.onboardos.onboarding.domain.document;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Table(name = "document_chunks")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DocumentChunk {

    @Id
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "chunk_index", nullable = false)
    private int chunkIndex;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "token_count")
    private Integer tokenCount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String metadata = "{}";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public static DocumentChunk create(UUID documentId, UUID workspaceId, int index, String content) {
        return create(documentId, workspaceId, index, content, "{}");
    }

    public static DocumentChunk create(UUID documentId, UUID workspaceId, int index, String content, String metadata) {
        DocumentChunk c = new DocumentChunk();
        c.id = UUID.randomUUID();
        c.documentId = documentId;
        c.workspaceId = workspaceId;
        c.chunkIndex = index;
        c.content = content;
        c.tokenCount = content == null ? 0 : content.length() / 4;
        c.metadata = metadata;
        c.createdAt = Instant.now();
        return c;
    }
}
