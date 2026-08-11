package com.onboardos.onboarding.document.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record DocumentPageResponse(
        List<DocumentResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static DocumentPageResponse from(Page<DocumentResponse> result) {
        return new DocumentPageResponse(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }
}
