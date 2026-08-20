package com.onboardos.onboarding.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.ai.LlmService;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.plan.PlanItemType;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.domain.workspace.Workspace;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PlanAiGenerationServiceTest {
    private final LlmService llm = mock(LlmService.class);
    private final PlanAiGenerationService service = new PlanAiGenerationService(llm);
    private final Membership member = Membership.create(UUID.randomUUID(), UUID.randomUUID(),
            UserRole.NEW_HIRE, "Platform", "JUNIOR", "Backend Engineer");
    private final Workspace workspace = Workspace.create("Acme", "acme");

    @Test
    void persistsValidatedPersonalizedAiItemsAndDocumentId() {
        DocumentEntity document = mock(DocumentEntity.class);
        UUID documentId = UUID.randomUUID();
        when(document.getId()).thenReturn(documentId);
        when(document.getTitle()).thenReturn("Backend handbook");
        when(llm.isEnabled()).thenReturn(true);
        when(llm.generateOnboardingPlanJson(any(), any(), any(), any(), any(), any())).thenReturn("""
                {"items":[
                  {"dayIndex":2,"type":"DOCUMENT","title":"Read backend handbook","description":"Platform basics","estimatedMinutes":45,"documentId":"%s"},
                  {"dayIndex":5,"type":"PRACTICE","title":"Implement a small API","description":"Junior backend task","estimatedMinutes":90}
                ]}
                """.formatted(documentId));

        PlanAiGenerationService.Result result = service.generate(member, workspace, List.of(document));

        assertThat(result.source()).isEqualTo("AI");
        assertThat(result.items()).hasSize(2);
        assertThat(result.items().get(0).documentId()).isEqualTo(documentId);
        assertThat(result.items()).extracting(PlanAiGenerationService.Item::title)
                .contains("Implement a small API");
    }

    @Test
    void invalidDocumentIdAndDuplicateItemsAreRejected() {
        when(llm.isEnabled()).thenReturn(true);
        when(llm.generateOnboardingPlanJson(any(), any(), any(), any(), any(), any())).thenReturn("""
                {"items":[
                  {"dayIndex":2,"type":"DOCUMENT","title":"Secret","estimatedMinutes":10,"documentId":"%s"},
                  {"dayIndex":4,"type":"CHECKLIST","title":"Meet team","estimatedMinutes":20},
                  {"dayIndex":4,"type":"CHECKLIST","title":"Meet team","estimatedMinutes":20}
                ]}
                """.formatted(UUID.randomUUID()));

        PlanAiGenerationService.Result result = service.generate(member, workspace, List.of());

        assertThat(result.source()).isEqualTo("AI");
        assertThat(result.items()).singleElement()
                .extracting(PlanAiGenerationService.Item::type).isEqualTo(PlanItemType.CHECKLIST);
    }

    @Test
    void malformedOrEmptyAiResponseUsesRoleAwareFallback() {
        when(llm.isEnabled()).thenReturn(true);
        when(llm.generateOnboardingPlanJson(any(), any(), any(), any(), any(), any())).thenReturn("not-json");

        PlanAiGenerationService.Result result = service.generate(member, workspace, List.of());

        assertThat(result.source()).isEqualTo("FALLBACK");
        assertThat(result.items()).extracting(PlanAiGenerationService.Item::title)
                .anyMatch(title -> title.contains("Backend Engineer"));
    }

    @Test
    void disabledAiUsesAccessibleDocumentsInFallback() {
        DocumentEntity document = mock(DocumentEntity.class);
        UUID documentId = UUID.randomUUID();
        when(document.getId()).thenReturn(documentId);
        when(document.getTitle()).thenReturn("Security policy");
        when(llm.isEnabled()).thenReturn(false);

        PlanAiGenerationService.Result result = service.generate(member, workspace, List.of(document));

        assertThat(result.source()).isEqualTo("FALLBACK");
        assertThat(result.items()).anySatisfy(item -> {
            assertThat(item.type()).isEqualTo(PlanItemType.DOCUMENT);
            assertThat(item.documentId()).isEqualTo(documentId);
        });
    }
}
