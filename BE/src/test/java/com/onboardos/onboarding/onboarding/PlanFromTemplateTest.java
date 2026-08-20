package com.onboardos.onboarding.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentStatus;
import com.onboardos.onboarding.domain.plan.ChecklistItem;
import com.onboardos.onboarding.domain.plan.ChecklistItemRepository;
import com.onboardos.onboarding.domain.plan.OnboardingPlan;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItem;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItemRepository;
import com.onboardos.onboarding.domain.plan.OnboardingPlanRepository;
import com.onboardos.onboarding.domain.plan.PlanItemType;
import com.onboardos.onboarding.domain.plan.PlanStatus;
import com.onboardos.onboarding.domain.template.OnboardingTemplateItem;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.onboarding.dto.PlanResponse;
import com.onboardos.onboarding.template.TemplateService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

/** 템플릿이 있을 때 계획이 어떻게 만들어지는지 (역할 매칭 · 문서 중복 방지 · 분산) */
class PlanFromTemplateTest {

    private final OnboardingPlanRepository plans = mock(OnboardingPlanRepository.class);
    private final OnboardingPlanItemRepository planItems = mock(OnboardingPlanItemRepository.class);
    private final ChecklistItemRepository checklists = mock(ChecklistItemRepository.class);
    private final DocumentRepository documents = mock(DocumentRepository.class);
    private final MembershipRepository memberships = mock(MembershipRepository.class);
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final TemplateService templates = mock(TemplateService.class);

    private final OnboardingPlanService service = new OnboardingPlanService(
            plans, planItems, checklists, documents, memberships, access, templates);

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void noExistingPlan() {
        // 서비스는 save() 의 반환값을 쓴다 (@Id 수동 할당이라 Spring Data 가 merge 를 호출하고,
        // 인자로 넘긴 객체는 detached 로 남기 때문). 목도 인자를 그대로 돌려줘야 한다.
        when(plans.save(any(OnboardingPlan.class))).thenAnswer(call -> call.getArgument(0));
        when(plans.findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(
                workspaceId, userId, PlanStatus.ACTIVE)).thenReturn(Optional.empty());
        when(checklists.findByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByDueDayAsc(any(), any())).thenReturn(List.of());
        when(memberships.findByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, userId))
                .thenReturn(Optional.of(Membership.create(
                        workspaceId, userId, UserRole.NEW_HIRE, "마케팅팀", "JUNIOR", "마케터")));
    }

    private DocumentEntity document(String title) {
        DocumentEntity doc = mock(DocumentEntity.class);
        when(doc.getId()).thenReturn(UUID.randomUUID());
        when(doc.getTitle()).thenReturn(title);
        return doc;
    }

    private OnboardingTemplateItem templateItem(int day, PlanItemType type, String title) {
        OnboardingTemplateItem item = OnboardingTemplateItem.create(
                UUID.randomUUID(), day, type, title, "설명", day);
        return item;
    }

    private List<OnboardingPlanItem> generatedItems() {
        ArgumentCaptor<List<OnboardingPlanItem>> captor = ArgumentCaptor.captor();
        org.mockito.Mockito.verify(planItems).saveAll(captor.capture());
        return captor.getValue();
    }

    @Test
    @DisplayName("멤버 역할이 템플릿 조회에 전달된다")
    void memberRoleIsUsedForTemplateLookup() {
        when(documents.findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, DocumentStatus.READY))
                .thenReturn(List.of());
        when(templates.loadItemsForPlan(workspaceId, null, UserRole.NEW_HIRE))
                .thenReturn(List.of(templateItem(1, PlanItemType.CHECKLIST, "역할 템플릿 항목")));

        service.generateForUser(workspaceId, userId, false);

        assertThat(generatedItems()).extracting(OnboardingPlanItem::getTitle)
                .contains("역할 템플릿 항목");
    }

    @Test
    @DisplayName("템플릿이 이미 다루는 문서는 '문서 읽기' 항목으로 중복 추가하지 않는다")
    void doesNotDuplicateDocumentsAlreadyCoveredByTemplate() {
        DocumentEntity covered = document("2026년도_1분기_마케팅_전략기획서.pdf");
        DocumentEntity uncovered = document("사내_보안_및_데이터접근_가이드라인.pdf");
        when(documents.findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, DocumentStatus.READY))
                .thenReturn(List.of(covered, uncovered));
        when(templates.loadItemsForPlan(workspaceId, null, UserRole.NEW_HIRE)).thenReturn(List.of(
                templateItem(3, PlanItemType.DOCUMENT, "2026년도 1분기 마케팅 전략기획서 읽기"),
                templateItem(30, PlanItemType.PRACTICE, "첫 캠페인 실행")
        ));

        service.generateForUser(workspaceId, userId, false);

        List<String> titles = generatedItems().stream().map(OnboardingPlanItem::getTitle).toList();
        // 템플릿이 다룬 문서는 보완 항목이 생기지 않는다
        assertThat(titles).noneMatch(t -> t.startsWith("문서 읽기: 2026년도_1분기_마케팅"));
        // 다루지 않은 문서는 보완된다
        assertThat(titles).anyMatch(t -> t.equals("문서 읽기: 사내_보안_및_데이터접근_가이드라인.pdf"));
    }

    @Test
    @DisplayName("보완 문서는 개수 제한으로 버려지지 않고 기간에 분산된다")
    void uncoveredDocumentsAreSpreadNotTruncated() {
        List<DocumentEntity> docs = new java.util.ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            docs.add(document("문서" + i + "_자료.pdf"));
        }
        when(documents.findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, DocumentStatus.READY))
                .thenReturn(docs);
        when(templates.loadItemsForPlan(workspaceId, null, UserRole.NEW_HIRE))
                .thenReturn(List.of(templateItem(30, PlanItemType.PRACTICE, "마지막 항목")));

        service.generateForUser(workspaceId, userId, false);

        List<OnboardingPlanItem> docItems = generatedItems().stream()
                .filter(i -> i.getType() == PlanItemType.DOCUMENT)
                .toList();
        // 15건 전부 살아 있어야 한다 (이전 구현은 9건에서 끊겼다)
        assertThat(docItems).hasSize(15);
        assertThat(docItems).extracting(OnboardingPlanItem::getDayIndex)
                .allSatisfy(day -> assertThat(day).isBetween(1, 30));
        // 하루에 몰려 있지 않아야 한다
        assertThat(docItems.stream().map(OnboardingPlanItem::getDayIndex).distinct().count())
                .isGreaterThan(5);
    }

    @Test
    @DisplayName("템플릿이 없으면 기본 골격을 쓰고, 그 골격은 특정 직군을 전제하지 않는다")
    void fallbackSkeletonIsRoleAgnostic() {
        when(documents.findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, DocumentStatus.READY))
                .thenReturn(List.of());
        when(templates.loadItemsForPlan(workspaceId, null, UserRole.NEW_HIRE)).thenReturn(List.of());

        PlanResponse response = service.generateForUser(workspaceId, userId, false);

        assertThat(response).isNotNull();
        assertThat(generatedItems()).extracting(OnboardingPlanItem::getTitle)
                .noneMatch(t -> t.contains("개발환경") || t.contains("저장소") || t.contains("클론"));
    }

    @Test
    @DisplayName("기본 골격에서도 문서는 하루에 몰리지 않고 분산된다")
    void defaultItemsSpreadDocuments() {
        List<DocumentEntity> docs = new java.util.ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            docs.add(document("자료" + i + ".pdf"));
        }
        when(documents.findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, DocumentStatus.READY))
                .thenReturn(docs);
        when(templates.loadItemsForPlan(workspaceId, null, UserRole.NEW_HIRE)).thenReturn(List.of());

        service.generateForUser(workspaceId, userId, false);

        List<OnboardingPlanItem> docItems = generatedItems().stream()
                .filter(i -> i.getType() == PlanItemType.DOCUMENT)
                .toList();
        assertThat(docItems).hasSize(20);
        assertThat(docItems).extracting(OnboardingPlanItem::getDayIndex)
                .allSatisfy(day -> assertThat(day).isBetween(1, 30));
    }

    @Test
    @DisplayName("멤버십이 없어도 계획 생성이 실패하지 않는다")
    void worksWhenMembershipMissing() {
        when(memberships.findByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, userId))
                .thenReturn(Optional.empty());
        when(documents.findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, DocumentStatus.READY))
                .thenReturn(List.of());
        when(templates.loadItemsForPlan(workspaceId, null, null)).thenReturn(List.of());

        assertThat(service.generateForUser(workspaceId, userId, false)).isNotNull();
    }
}
