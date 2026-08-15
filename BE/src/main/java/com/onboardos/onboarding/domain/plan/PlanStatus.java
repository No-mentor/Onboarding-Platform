package com.onboardos.onboarding.domain.plan;

/**
 * 온보딩 계획의 상태.
 * DB CHECK 제약: status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED')
 */
public enum PlanStatus {
    DRAFT,
    ACTIVE,
    COMPLETED,
    ARCHIVED
}
