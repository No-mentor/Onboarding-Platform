package com.onboardos.onboarding.domain.template;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OnboardingTemplateItemRepository extends JpaRepository<OnboardingTemplateItem, UUID> {

    List<OnboardingTemplateItem> findByTemplateIdOrderByDayIndexAscSortOrderAsc(UUID templateId);

    void deleteByTemplateId(UUID templateId);
}
