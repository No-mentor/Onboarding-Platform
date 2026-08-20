package com.onboardos.onboarding.template.dto;

public record ApplyTemplateRequest(
        Boolean keepCompleted
) {
    public boolean shouldKeepCompleted() {
        return Boolean.TRUE.equals(keepCompleted);
    }
}
