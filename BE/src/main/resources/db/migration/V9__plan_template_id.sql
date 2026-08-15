-- OnboardingPlan에 template_id FK 추가 (ERD 정합)
-- 계획 생성 시 사용된 템플릿 참조를 저장한다.
ALTER TABLE onboarding_plans
    ADD COLUMN template_id UUID REFERENCES onboarding_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_plans_template ON onboarding_plans(template_id) WHERE template_id IS NOT NULL;
