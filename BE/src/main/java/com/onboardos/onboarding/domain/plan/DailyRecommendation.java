package com.onboardos.onboarding.domain.plan;

import com.onboardos.onboarding.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Table(name = "daily_recommendations")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DailyRecommendation extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "recommend_date", nullable = false)
    private LocalDate recommendDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PlanItemType type;

    @Column(nullable = false, length = 500)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItemStatus status = ItemStatus.PENDING;

    @Column(nullable = false)
    private int priority = 1;

    @Column(nullable = false, length = 30)
    private String source = "PLAN";

    @Column(name = "plan_item_id")
    private UUID planItemId;

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "person_name")
    private String personName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String metadata = "{}";

    @Column(name = "completed_at")
    private Instant completedAt;

    public static DailyRecommendation fromPlanItem(
            UUID workspaceId,
            UUID userId,
            LocalDate date,
            OnboardingPlanItem item,
            int priority
    ) {
        DailyRecommendation r = new DailyRecommendation();
        r.id = UUID.randomUUID();
        r.workspaceId = workspaceId;
        r.userId = userId;
        r.recommendDate = date;
        r.type = item.getType();
        r.title = item.getTitle();
        r.status = ItemStatus.PENDING;
        r.priority = priority;
        r.source = "PLAN";
        r.planItemId = item.getId();
        r.documentId = item.getDocumentId();
        r.personName = item.getPersonName();
        r.metadata = "{}";
        return r;
    }

    public void markDone() {
        this.status = ItemStatus.DONE;
        this.completedAt = Instant.now();
    }

    public void dismiss() {
        this.status = ItemStatus.DISMISSED;
    }
}
