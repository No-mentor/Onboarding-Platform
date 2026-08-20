package com.onboardos.onboarding.domain.document;

import com.onboardos.onboarding.domain.common.BaseTimeEntity;
import com.onboardos.onboarding.domain.user.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Table(name = "documents")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DocumentEntity extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(nullable = false, length = 500)
    private String title;

    private String description;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "original_filename", length = 500)
    private String originalFilename;

    @Column(name = "mime_type", length = 120)
    private String mimeType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentStatus status = DocumentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentVisibility visibility = DocumentVisibility.WORKSPACE;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allowed_roles", nullable = false, columnDefinition = "jsonb")
    private List<String> allowedRoles = new ArrayList<>();

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "chunk_count", nullable = false)
    private int chunkCount = 0;

    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "storage_purged_at")
    private Instant storagePurgedAt;

    public static DocumentEntity create(
            UUID workspaceId,
            String title,
            String storageKey,
            String originalFilename,
            String mimeType,
            Long sizeBytes,
            DocumentVisibility visibility,
            List<UserRole> allowedRoles,
            UUID uploadedBy
    ) {
        DocumentEntity d = new DocumentEntity();
        d.id = UUID.randomUUID();
        d.workspaceId = workspaceId;
        d.title = title;
        d.storageKey = storageKey;
        d.originalFilename = originalFilename;
        d.mimeType = mimeType;
        d.sizeBytes = sizeBytes;
        d.status = DocumentStatus.PENDING;
        d.visibility = visibility == null ? DocumentVisibility.WORKSPACE : visibility;
        d.allowedRoles = allowedRoles == null
                ? new ArrayList<>()
                : allowedRoles.stream().map(Enum::name).toList();
        d.uploadedBy = uploadedBy;
        d.chunkCount = 0;
        return d;
    }

    public void markProcessing() {
        this.status = DocumentStatus.PROCESSING;
        this.errorMessage = null;
    }

    public void markReady(int chunks) {
        this.status = DocumentStatus.READY;
        this.chunkCount = chunks;
        this.errorMessage = null;
    }

    public void markFailed(String message) {
        this.status = DocumentStatus.FAILED;
        this.errorMessage = message;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void markStoragePurged(Instant purgedAt) {
        this.storagePurgedAt = purgedAt;
    }

    public void resetForReprocess() {
        this.status = DocumentStatus.PENDING;
        this.errorMessage = null;
        this.chunkCount = 0;
    }
}
