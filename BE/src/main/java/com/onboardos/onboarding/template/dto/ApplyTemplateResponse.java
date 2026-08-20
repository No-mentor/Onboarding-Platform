package com.onboardos.onboarding.template.dto;

import java.util.List;
import java.util.UUID;

public record ApplyTemplateResponse(
        int totalAffected,
        int successCount,
        int failCount,
        List<AffectedUser> users
) {
    public record AffectedUser(UUID userId, String status, String message) {}

    public static ApplyTemplateResponse success(List<AffectedUser> users) {
        long success = users.stream().filter(u -> "SUCCESS".equals(u.status())).count();
        long fail = users.stream().filter(u -> "FAILED".equals(u.status())).count();
        return new ApplyTemplateResponse(users.size(), (int) success, (int) fail, users);
    }
}
