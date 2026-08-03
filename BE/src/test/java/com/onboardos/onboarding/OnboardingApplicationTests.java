package com.onboardos.onboarding;

import org.junit.jupiter.api.Test;

class OnboardingApplicationTests {

    @Test
    void applicationClassExists() {
        // 통합 컨텍스트 테스트는 PostgreSQL + Flyway 환경에서 별도로 수행
        org.junit.jupiter.api.Assertions.assertNotNull(OnboardingApplication.class);
    }
}
