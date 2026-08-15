package com.onboardos.onboarding.domain.plan;

import com.onboardos.onboarding.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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
@Table(name = "onboarding_plans")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnboardingPlan extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlanStatus status = PlanStatus.ACTIVE;

    @Column(nullable = false)
    private int version = 1;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "progress_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal progressPercent = BigDecimal.ZERO;

    @Column(name = "generated_by", nullable = false, length = 20)
    private String generatedBy = "TEMPLATE";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String meta = "{}";

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public static OnboardingPlan create(UUID workspaceId, UUID userId, LocalDate start) {
        OnboardingPlan p = new OnboardingPlan();
        p.id = UUID.randomUUID();
        p.workspaceId = workspaceId;
        p.userId = userId;
        p.status = PlanStatus.ACTIVE;
        p.version = 1;
        p.startDate = start;
        p.endDate = start.plusDays(29);
        p.progressPercent = BigDecimal.ZERO;
        p.generatedBy = "TEMPLATE";
        p.meta = "{}";
        return p;
    }

    public void archive() {
        this.status = PlanStatus.ARCHIVED;
    }

    public void complete() {
        this.status = PlanStatus.COMPLETED;
    }

    public void updateProgress(BigDecimal percent) {
        this.progressPercent = percent;
        // 100% 도달 시 자동 완료
        if (percent.compareTo(BigDecimal.valueOf(100)) >= 0 && this.status == PlanStatus.ACTIVE) {
            this.status = PlanStatus.COMPLETED;
        }
    }

    public void bumpVersion() {
        this.version += 1;
    }
}
