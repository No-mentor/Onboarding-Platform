package com.onboardos.onboarding.domain.template;

import com.onboardos.onboarding.domain.plan.PlanItemType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Table(name = "onboarding_template_items")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnboardingTemplateItem {

    @Id
    private UUID id;

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(name = "day_index", nullable = false)
    private int dayIndex;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PlanItemType type;

    @Column(nullable = false, length = 500)
    private String title;

    private String description;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String metadata = "{}";

    public static OnboardingTemplateItem create(
            UUID templateId,
            int dayIndex,
            PlanItemType type,
            String title,
            String description,
            int sortOrder,
            UUID documentId,
            Integer estimatedMinutes
    ) {
        OnboardingTemplateItem i = new OnboardingTemplateItem();
        i.id = UUID.randomUUID();
        i.templateId = templateId;
        i.dayIndex = dayIndex;
        i.type = type;
        i.title = title;
        i.description = description;
        i.sortOrder = sortOrder;
        i.documentId = documentId;
        i.estimatedMinutes = estimatedMinutes;
        i.metadata = "{}";
        return i;
    }

    public static OnboardingTemplateItem create(
            UUID templateId, int dayIndex, PlanItemType type, String title, String description, int sortOrder
    ) {
        return create(templateId, dayIndex, type, title, description, sortOrder, null, null);
    }
}
