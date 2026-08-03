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

@Getter
@Entity
@Table(name = "checklist_items")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChecklistItem extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "plan_item_id")
    private UUID planItemId;

    @Column(nullable = false, length = 500)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItemStatus status = ItemStatus.PENDING;

    @Column(name = "due_day")
    private Integer dueDay;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public static ChecklistItem create(
            UUID workspaceId,
            UUID userId,
            UUID planItemId,
            String title,
            Integer dueDay
    ) {
        ChecklistItem c = new ChecklistItem();
        c.id = UUID.randomUUID();
        c.workspaceId = workspaceId;
        c.userId = userId;
        c.planItemId = planItemId;
        c.title = title;
        c.dueDay = dueDay;
        c.status = ItemStatus.PENDING;
        return c;
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
