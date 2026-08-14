package com.onboardos.onboarding.document.api.dto;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentStatus;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String title,
        DocumentStatus status,
        DocumentVisibility visibility,
        List<String> allowedRoles,
        String mimeType,
        Long sizeBytes,
        Integer chunkCount,
        String errorMessage,
        Instant createdAt,
        Instant updatedAt
) {
    public static DocumentResponse from(DocumentEntity d) {
        return new DocumentResponse(
                d.getId(),
                d.getTitle(),
                d.getStatus(),
                d.getVisibility(),
                d.getAllowedRoles(),
                d.getMimeType(),
                d.getSizeBytes(),
                d.getChunkCount(),
                d.getErrorMessage(),
                d.getCreatedAt(),
                d.getUpdatedAt()
        );
    }
}
