package com.onboardos.onboarding.template;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.ai.LlmService;
import com.onboardos.onboarding.ai.chat.ChatProviderException;
import com.onboardos.onboarding.domain.document.DocumentChunkRepository;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.plan.PlanItemType;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.template.dto.GenerateTemplateRequest;
import com.onboardos.onboarding.template.dto.GeneratedTemplateResponse;
import com.onboardos.onboarding.template.dto.TemplateItemRequest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * LLM 응답은 비결정적이므로 ChatClient 대신 LlmService 를 목으로 두고,
 * "모델이 이런 문자열을 주면 우리가 어떻게 해석하는가" 만 검증한다.
 */
class TemplateGenerationServiceTest {

    private final DocumentRepository documents = mock(DocumentRepository.class);
    private final DocumentChunkRepository chunks = mock(DocumentChunkRepository.class);
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final LlmService llm = mock(LlmService.class);
    private final TemplateGenerationService service =
            new TemplateGenerationService(documents, chunks, access, llm);

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final UserPrincipal principal = new UserPrincipal(actorId, "owner@example.com", "hash", true);

    @BeforeEach
    void ownerCanGenerate() {
        when(access.requireRoles(workspaceId, actorId, UserRole.OWNER, UserRole.ADMIN))
                .thenReturn(Membership.create(workspaceId, actorId, UserRole.OWNER, null, null, null));
        when(documents.findByWorkspaceIdAndStatusAndDeletedAtIsNull(any(), any())).thenReturn(List.of());
        when(llm.isEnabled()).thenReturn(true);
        when(llm.modelName()).thenReturn("gpt-4o-mini");
    }

    private GeneratedTemplateResponse generate() {
        return service.generate(principal, workspaceId,
                new GenerateTemplateRequest(UserRole.NEW_HIRE, "마케팅팀", null, 30));
    }

    private void modelReturns(String raw) {
        when(llm.generateTemplateItemsJson(any(), any(), anyInt(), anyList())).thenReturn(raw);
    }

    @Test
    @DisplayName("모델이 준 JSON 을 항목으로 해석하고 dayIndex 순으로 정렬한다")
    void parsesAndSortsModelOutput() {
        modelReturns("""
                {"items":[
                  {"dayIndex":10,"type":"PRACTICE","title":"캠페인 초안 작성","description":"리뷰 받기"},
                  {"dayIndex":1,"type":"CHECKLIST","title":"계정 발급 확인","description":"툴 접근"},
                  {"dayIndex":5,"type":"PERSON","title":"팀 리드 1:1","description":"기대치 확인"}
                ]}
                """);

        GeneratedTemplateResponse result = generate();

        assertThat(result.aiGenerated()).isTrue();
        assertThat(result.fallbackReason()).isNull();
        assertThat(result.model()).isEqualTo("gpt-4o-mini");
        assertThat(result.items()).extracting(TemplateItemRequest::dayIndex).containsExactly(1, 5, 10);
        assertThat(result.items()).extracting(TemplateItemRequest::sortOrder).containsExactly(0, 1, 2);
        assertThat(result.items().get(0).type()).isEqualTo(PlanItemType.CHECKLIST);
        assertThat(result.name()).isEqualTo("마케팅팀 신입 구성원 온보딩");
    }

    @Test
    @DisplayName("코드펜스나 앞뒤 설명이 섞여 와도 JSON 구간만 뽑아낸다")
    void toleratesCodeFenceAroundJson() {
        modelReturns("""
                네, 계획을 만들었습니다.
                ```json
                {"items":[
                  {"dayIndex":1,"type":"CHECKLIST","title":"A","description":"a"},
                  {"dayIndex":2,"type":"CHECKLIST","title":"B","description":"b"},
                  {"dayIndex":3,"type":"CHECKLIST","title":"C","description":"c"}
                ]}
                ```
                도움이 되었길 바랍니다.
                """);

        GeneratedTemplateResponse result = generate();

        assertThat(result.aiGenerated()).isTrue();
        assertThat(result.items()).hasSize(3);
    }

    @Test
    @DisplayName("형식이 어긋난 항목만 걸러 내고 나머지는 살린다")
    void dropsOnlyInvalidItems() {
        modelReturns("""
                {"items":[
                  {"dayIndex":1,"type":"CHECKLIST","title":"살아남는 항목","description":"ok"},
                  {"dayIndex":99,"type":"CHECKLIST","title":"기간 밖","description":"버려짐"},
                  {"dayIndex":2,"type":"NOT_A_TYPE","title":"타입 오류","description":"버려짐"},
                  {"dayIndex":3,"type":"PRACTICE","title":"","description":"제목 없음"},
                  {"dayIndex":4,"type":"PERSON","title":"두 번째 생존","description":"ok"},
                  {"dayIndex":5,"type":"DOCUMENT","title":"세 번째 생존","description":"ok"}
                ]}
                """);

        GeneratedTemplateResponse result = generate();

        assertThat(result.aiGenerated()).isTrue();
        assertThat(result.items())
                .extracting(TemplateItemRequest::title)
                .containsExactly("살아남는 항목", "두 번째 생존", "세 번째 생존");
    }

    @Test
    @DisplayName("쓸 만한 항목이 너무 적으면 기본 골격으로 대체한다")
    void fallsBackWhenTooFewValidItems() {
        modelReturns("""
                {"items":[{"dayIndex":1,"type":"CHECKLIST","title":"하나뿐","description":"x"}]}
                """);

        GeneratedTemplateResponse result = generate();

        assertThat(result.aiGenerated()).isFalse();
        assertThat(result.fallbackReason()).contains("해석할 수 없어");
        assertThat(result.items()).hasSizeGreaterThanOrEqualTo(3);
        assertThat(result.model()).isNull();
    }

    @Test
    @DisplayName("JSON 이 전혀 아니면 기본 골격으로 대체한다")
    void fallsBackOnNonJsonOutput() {
        modelReturns("죄송하지만 요청을 처리할 수 없습니다.");

        GeneratedTemplateResponse result = generate();

        assertThat(result.aiGenerated()).isFalse();
        assertThat(result.items()).isNotEmpty();
    }

    @Test
    @DisplayName("AI 가 꺼져 있으면 LLM 을 호출하지 않고 기본 골격을 준다")
    void skipsLlmWhenDisabled() {
        when(llm.isEnabled()).thenReturn(false);

        GeneratedTemplateResponse result = generate();

        assertThat(result.aiGenerated()).isFalse();
        assertThat(result.fallbackReason()).contains("AI 기능이 꺼져");
        verify(llm, never()).generateTemplateItemsJson(any(), any(), anyInt(), anyList());
    }

    @Test
    @DisplayName("LLM 호출이 실패해도 예외를 밖으로 던지지 않고 기본 골격을 준다")
    void fallsBackWhenLlmThrows() {
        when(llm.generateTemplateItemsJson(any(), any(), anyInt(), anyList()))
                .thenThrow(new ChatProviderException("timeout", new RuntimeException("read timed out")));

        GeneratedTemplateResponse result = generate();

        assertThat(result.aiGenerated()).isFalse();
        assertThat(result.fallbackReason()).contains("AI 호출에 실패");
        assertThat(result.items()).isNotEmpty();
    }

    @Test
    @DisplayName("기본 골격은 특정 직군을 전제하지 않는다")
    void fallbackIsRoleAgnostic() {
        when(llm.isEnabled()).thenReturn(false);

        GeneratedTemplateResponse result = generate();

        assertThat(result.items()).extracting(TemplateItemRequest::title)
                .noneMatch(t -> t.contains("개발") || t.contains("저장소") || t.contains("클론"));
        // 기간 마지막 날에 독립 업무 항목이 있어야 한다
        assertThat(result.items()).anySatisfy(item -> {
            assertThat(item.dayIndex()).isEqualTo(30);
            assertThat(item.type()).isEqualTo(PlanItemType.PRACTICE);
        });
    }

    @Test
    @DisplayName("권한이 없으면 문서를 읽기 전에 막힌다")
    void rejectsUnauthorizedBeforeReadingDocuments() {
        when(access.requireRoles(workspaceId, actorId, UserRole.OWNER, UserRole.ADMIN))
                .thenThrow(new RuntimeException("forbidden"));

        try {
            generate();
        } catch (RuntimeException ignored) {
            // 권한 검사에서 막히는 것이 목적
        }
        verify(documents, never()).findByWorkspaceIdAndStatusAndDeletedAtIsNull(any(), any());
        verify(llm, never()).generateTemplateItemsJson(any(), any(), anyInt(), anyList());
    }
}
