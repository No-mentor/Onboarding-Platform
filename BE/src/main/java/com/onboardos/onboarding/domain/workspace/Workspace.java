package com.onboardos.onboarding.domain.workspace;

import com.onboardos.onboarding.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "workspaces")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Workspace extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 80)
    private String slug;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String settings = "{}";

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public static Workspace create(String name, String slug) {
        Workspace ws = new Workspace();
        ws.id = UUID.randomUUID();
        ws.name = name.trim();
        ws.slug = slug.trim().toLowerCase();
        ws.settings = "{}";
        return ws;
    }

    public void rename(String name) {
        this.name = name.trim();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
