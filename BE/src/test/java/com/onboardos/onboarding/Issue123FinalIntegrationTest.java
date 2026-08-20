package com.onboardos.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.plan.ChecklistItem;
import com.onboardos.onboarding.domain.plan.ChecklistItemRepository;
import com.onboardos.onboarding.domain.plan.ItemStatus;
import com.onboardos.onboarding.domain.plan.OnboardingPlan;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItem;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItemRepository;
import com.onboardos.onboarding.domain.plan.OnboardingPlanRepository;
import com.onboardos.onboarding.domain.plan.PlanItemType;
import com.onboardos.onboarding.domain.template.OnboardingTemplate;
import com.onboardos.onboarding.domain.template.OnboardingTemplateRepository;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.domain.workspace.Workspace;
import com.onboardos.onboarding.domain.workspace.WorkspaceRepository;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.onboarding.OnboardingPlanService;
import com.onboardos.onboarding.onboarding.dto.PlanResponse;
import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
import com.onboardos.onboarding.template.TemplateService;
import com.onboardos.onboarding.template.dto.CreateTemplateRequest;
import com.onboardos.onboarding.template.dto.TemplateItemRequest;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@Tag("integration")
@SpringBootTest
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class Issue123FinalIntegrationTest {
    @Autowired TemplateService templates;
    @Autowired OnboardingPlanService plans;
    @Autowired WorkspaceRepository workspaces;
    @Autowired UserRepository users;
    @Autowired MembershipRepository memberships;
    @Autowired OnboardingTemplateRepository templateRepository;
    @Autowired OnboardingPlanRepository planRepository;
    @Autowired OnboardingPlanItemRepository planItems;
    @Autowired ChecklistItemRepository checklists;
    @Autowired JdbcTemplate jdbc;

    record Fixture(UUID workspaceId, UUID ownerId, UUID newHireId, UserPrincipal owner) {}

    @Test
    void templateDocumentAclIsRecheckedForTargetUserAfterAclChange() {
        Fixture fixture = fixture();
        UUID documentId = insertDocument(fixture.workspaceId(), "NEW_HIRE confidential", "READY",
                "RESTRICTED", "[\"OWNER\",\"NEW_HIRE\"]", null);
        var created = templates.create(fixture.owner(), fixture.workspaceId(), new CreateTemplateRequest(
                "ACL template", UserRole.NEW_HIRE, null, true,
                List.of(new TemplateItemRequest(1, PlanItemType.DOCUMENT, "Read confidential",
                        null, 0, documentId, 30))));

        jdbc.update("UPDATE documents SET allowed_roles='[\"OWNER\",\"ADMIN\"]'::jsonb WHERE id=?", documentId);

        assertThatThrownBy(() -> plans.generateForUser(
                fixture.workspaceId(), fixture.newHireId(), false, created.id()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("접근할 수 없는 문서");

        PlanResponse automatic = plans.generateForUser(fixture.workspaceId(), fixture.newHireId(), false, null);
        assertThat(automatic.generatedBy()).isEqualTo("FALLBACK");
        assertThat(automatic.items()).noneMatch(item -> documentId.equals(item.documentId())
                || item.title().contains("confidential"));
    }

    @Test
    void newTemplateRequestsEnforceConditionalDocumentIdAndDocumentLifecycle() {
        Fixture fixture = fixture();
        assertThatThrownBy(() -> templates.create(fixture.owner(), fixture.workspaceId(), request(
                "missing", new TemplateItemRequest(1, PlanItemType.DOCUMENT, "Missing", null, 0, null, 10))))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> templates.create(fixture.owner(), fixture.workspaceId(), request(
                "wrong type", new TemplateItemRequest(1, PlanItemType.PRACTICE, "Wrong", null, 0,
                        UUID.randomUUID(), 10))))
                .isInstanceOf(BusinessException.class);

        UUID otherWorkspace = fixture().workspaceId();
        UUID otherDocument = insertDocument(otherWorkspace, "Other workspace", "READY", "WORKSPACE", "[]", null);
        UUID processing = insertDocument(fixture.workspaceId(), "Processing", "PROCESSING", "WORKSPACE", "[]", null);
        UUID deleted = insertDocument(fixture.workspaceId(), "Deleted", "READY", "WORKSPACE", "[]",
                "now()");
        for (UUID invalid : List.of(otherDocument, processing, deleted)) {
            assertThatThrownBy(() -> templates.create(fixture.owner(), fixture.workspaceId(), request(
                    "invalid-" + invalid, new TemplateItemRequest(1, PlanItemType.DOCUMENT,
                            "Invalid", null, 0, invalid, 10))))
                    .isInstanceOf(BusinessException.class);
        }

        UUID adminOnly = insertDocument(fixture.workspaceId(), "Admin only", "READY", "RESTRICTED",
                "[\"OWNER\",\"ADMIN\"]", null);
        assertThatThrownBy(() -> templates.create(fixture.owner(), fixture.workspaceId(), request(
                "target denied", new TemplateItemRequest(1, PlanItemType.DOCUMENT,
                        "Denied", null, 0, adminOnly, 10))))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void regenerationPreservesOnlyStableMatchingItemAndChecklistAndIncrementsVersion() {
        Fixture fixture = fixture();
        var template = templates.create(fixture.owner(), fixture.workspaceId(), new CreateTemplateRequest(
                "Stable template", UserRole.NEW_HIRE, null, true, List.of(
                new TemplateItemRequest(1, PlanItemType.CHECKLIST, "Same title", null, 0, null, 10),
                new TemplateItemRequest(2, PlanItemType.CHECKLIST, "Same title", null, 1, null, 10),
                new TemplateItemRequest(1, PlanItemType.PRACTICE, "Same title", null, 2, null, 10))));
        PlanResponse first = plans.generateForUser(fixture.workspaceId(), fixture.newHireId(), false, template.id());
        OnboardingPlanItem completed = planItems.findById(first.items().get(0).id()).orElseThrow();
        completed.markDone();
        planItems.save(completed);
        ChecklistItem completedChecklist = checklists
                .findByWorkspaceIdAndUserIdAndPlanItemIdAndDeletedAtIsNull(
                        fixture.workspaceId(), fixture.newHireId(), completed.getId()).orElseThrow();
        completedChecklist.markDone();
        checklists.save(completedChecklist);

        PlanResponse regenerated = plans.regenerate(fixture.owner(), fixture.workspaceId(), first.planId(), true);

        assertThat(regenerated.version()).isEqualTo(first.version() + 1);
        assertThat(regenerated.items()).filteredOn(item -> item.status() == ItemStatus.DONE)
                .singleElement().satisfies(item -> {
                    assertThat(item.type()).isEqualTo(PlanItemType.CHECKLIST);
                    assertThat(item.dayIndex()).isEqualTo(1);
                    assertThat(checklists.findByWorkspaceIdAndUserIdAndPlanItemIdAndDeletedAtIsNull(
                            fixture.workspaceId(), fixture.newHireId(), item.id()).orElseThrow().getStatus())
                            .isEqualTo(ItemStatus.DONE);
                });

        PlanResponse fresh = plans.regenerate(fixture.owner(), fixture.workspaceId(), regenerated.planId(), false);
        assertThat(fresh.version()).isEqualTo(regenerated.version() + 1);
        assertThat(fresh.items()).allMatch(item -> item.status() == ItemStatus.PENDING);
    }

    @Test
    void concurrentDefaultSwitchLeavesExactlyOneDefaultWithoutCrossScopeImpact() throws Exception {
        Fixture fixture = fixture();
        var first = templates.create(fixture.owner(), fixture.workspaceId(), new CreateTemplateRequest(
                "Concurrent A", UserRole.NEW_HIRE, null, false,
                List.of(new TemplateItemRequest(1, PlanItemType.CHECKLIST, "A", null, 0))));
        var second = templates.create(fixture.owner(), fixture.workspaceId(), new CreateTemplateRequest(
                "Concurrent B", UserRole.NEW_HIRE, null, false,
                List.of(new TemplateItemRequest(1, PlanItemType.CHECKLIST, "B", null, 0))));
        templates.create(fixture.owner(), fixture.workspaceId(), new CreateTemplateRequest(
                "Owner default", UserRole.OWNER, null, true,
                List.of(new TemplateItemRequest(1, PlanItemType.CHECKLIST, "Owner", null, 0))));

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> one = executor.submit(() -> switchDefault(start, fixture, first.id(), "Concurrent A"));
            Future<?> two = executor.submit(() -> switchDefault(start, fixture, second.id(), "Concurrent B"));
            start.countDown();
            one.get();
            two.get();
        } finally {
            executor.shutdownNow();
        }

        List<OnboardingTemplate> all = templateRepository
                .findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(fixture.workspaceId());
        assertThat(all).filteredOn(t -> t.getTargetRole() == UserRole.NEW_HIRE && t.isDefault()).hasSize(1);
        assertThat(all).filteredOn(t -> t.getTargetRole() == UserRole.OWNER && t.isDefault()).hasSize(1);
    }

    @Test
    void templateUpdateUsesLatestSnapshotWhileExistingPlanAndOtherWorkspaceStayIsolated() {
        Fixture fixture = fixture();
        var template = templates.create(fixture.owner(), fixture.workspaceId(), new CreateTemplateRequest(
                "Snapshot template", UserRole.NEW_HIRE, null, false,
                List.of(new TemplateItemRequest(1, PlanItemType.CHECKLIST, "Original item", null, 0))));
        PlanResponse original = plans.generateForUser(
                fixture.workspaceId(), fixture.newHireId(), false, template.id());

        templates.update(fixture.owner(), fixture.workspaceId(), template.id(),
                new com.onboardos.onboarding.template.dto.UpdateTemplateRequest(
                        "Snapshot template", UserRole.NEW_HIRE, null, false, List.of(
                        new TemplateItemRequest(2, PlanItemType.PRACTICE, "Latest item", null, 1),
                        new TemplateItemRequest(1, PlanItemType.CHECKLIST, "Added item", null, 0))));

        assertThat(planItems.findByPlanIdOrderByDayIndexAscSortOrderAsc(original.planId()))
                .extracting(OnboardingPlanItem::getTitle).contains("Original item").doesNotContain("Latest item");
        PlanResponse latest = plans.generateForUser(
                fixture.workspaceId(), fixture.newHireId(), true, template.id());
        assertThat(latest.items()).extracting(item -> item.title())
                .containsExactly("Added item", "Latest item");

        Fixture other = fixture();
        assertThatThrownBy(() -> templates.update(other.owner(), other.workspaceId(), template.id(),
                new com.onboardos.onboarding.template.dto.UpdateTemplateRequest(
                        "Hijacked", UserRole.NEW_HIRE, null, false, null)))
                .isInstanceOf(BusinessException.class);
    }

    private void switchDefault(CountDownLatch start, Fixture fixture, UUID id, String name) {
        try {
            start.await();
            templates.update(fixture.owner(), fixture.workspaceId(), id,
                    new com.onboardos.onboarding.template.dto.UpdateTemplateRequest(
                            name, UserRole.NEW_HIRE, null, true, null));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(exception);
        }
    }

    private CreateTemplateRequest request(String name, TemplateItemRequest item) {
        return new CreateTemplateRequest(name, UserRole.NEW_HIRE, null, false, List.of(item));
    }

    private Fixture fixture() {
        Workspace workspace = workspaces.save(Workspace.create("Issue123 " + UUID.randomUUID(),
                "issue-" + UUID.randomUUID().toString().substring(0, 8)));
        User owner = users.save(User.create(UUID.randomUUID() + "@example.com", "Owner", "hash"));
        User newHire = users.save(User.create(UUID.randomUUID() + "@example.com", "New Hire", "hash"));
        memberships.save(Membership.createOwner(workspace.getId(), owner.getId()));
        memberships.save(Membership.create(workspace.getId(), newHire.getId(), UserRole.NEW_HIRE,
                "Engineering", "JUNIOR", "Backend Engineer"));
        return new Fixture(workspace.getId(), owner.getId(), newHire.getId(),
                new UserPrincipal(owner.getId(), owner.getEmail(), owner.getPasswordHash(), true));
    }

    private UUID insertDocument(UUID workspaceId, String title, String status, String visibility,
                                String allowedRoles, String deletedAtExpression) {
        UUID id = UUID.randomUUID();
        String deleted = deletedAtExpression == null ? "NULL" : deletedAtExpression;
        jdbc.update("INSERT INTO documents (id, workspace_id, title, storage_key, status, visibility, "
                        + "allowed_roles, chunk_count, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, 0, "
                        + deleted + ")",
                id, workspaceId, title, "test/" + id, status, visibility, allowedRoles);
        return id;
    }
}
