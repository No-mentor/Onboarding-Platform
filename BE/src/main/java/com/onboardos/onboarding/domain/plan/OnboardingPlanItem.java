package com.onboardos.onboarding.domain.plan;

import com.onboardos.onboarding.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Table(name = "onboarding_plan_items")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnboardingPlanItem extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "day_index", nullable = false)
    private int dayIndex;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PlanItemType type;

    @Column(nullable = false, length = 500)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItemStatus status = ItemStatus.PENDING;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "person_name")
    private String personName;

    @Column(name = "person_user_id")
    private UUID personUserId;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    @Column(name = "completed_at")
    private Instant completedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String metadata = "{}";

    public static OnboardingPlanItem create(
            UUID planId,
            UUID workspaceId,
            int dayIndex,
            PlanItemType type,
            String title,
            String description,
            int sortOrder,
            UUID documentId,
            String personName
    ) {
        OnboardingPlanItem item = new OnboardingPlanItem();
        item.id = UUID.randomUUID();
        item.planId = planId;
        item.workspaceId = workspaceId;
        item.dayIndex = dayIndex;
        item.type = type;
        item.title = title;
        item.description = description;
        item.sortOrder = sortOrder;
        item.documentId = documentId;
        item.personName = personName;
        item.status = ItemStatus.PENDING;
        item.metadata = "{}";
        return item;
    }

    public void markDone() {
        this.status = ItemStatus.DONE;
        this.completedAt = Instant.now();
    }

    public void markPending() {
        this.status = ItemStatus.PENDING;
        this.completedAt = null;
    }
}
