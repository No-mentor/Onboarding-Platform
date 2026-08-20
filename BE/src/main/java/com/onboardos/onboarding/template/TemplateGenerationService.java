package com.onboardos.onboarding.template;

import com.onboardos.onboarding.ai.LlmService;
import com.onboardos.onboarding.ai.chat.ChatProviderException;
import com.onboardos.onboarding.domain.document.DocumentChunk;
import com.onboardos.onboarding.domain.document.DocumentChunkRepository;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentStatus;
import com.onboardos.onboarding.domain.plan.PlanItemType;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.template.dto.GenerateTemplateRequest;
import com.onboardos.onboarding.template.dto.GeneratedTemplateResponse;
import com.onboardos.onboarding.template.dto.TemplateItemRequest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 업로드된 문서를 근거로 온보딩 템플릿 초안을 만든다.
 *
 * <p>저장은 하지 않는다. 초안을 돌려주고, 사용자가 화면에서 검토·수정한 뒤
 * 기존 {@code POST /api/v1/templates} 로 저장하는 흐름이다.
 * LLM 출력이 틀릴 수 있으므로 사람이 한 번 보는 단계를 반드시 거치게 하기 위한 설계다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TemplateGenerationService {

    /** 문서 하나가 프롬프트를 독점하지 않도록 문서별로 잘라 담는 상한 */
    private static final int MAX_CHARS_PER_DOCUMENT = 2_000;

    /** 프롬프트에 넣을 문서 개수 상한 */
    private static final int MAX_DOCUMENTS = 8;

    private static final int MIN_ITEMS = 3;
    private static final int MAX_ITEMS = 60;

    /** ChatService 와 같은 방식. 설정 커스터마이즈가 필요 없어 빈 주입을 쓰지 않는다 */
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final LlmService llmService;

    @Transactional(readOnly = true)
    public GeneratedTemplateResponse generate(
            UserPrincipal principal,
            UUID workspaceId,
            GenerateTemplateRequest request
    ) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);

        UserRole targetRole = request.targetRoleOrDefault();
        int planDays = request.planDaysOrDefault();

        List<DocumentEntity> documents = resolveDocuments(workspaceId, request.documentIds());
        List<String> snippets = documents.stream().map(this::documentText).filter(s -> !s.isBlank()).toList();
        List<String> titles = documents.stream().map(DocumentEntity::getTitle).toList();

        String name = defaultName(targetRole, request.department());
        String description = documents.isEmpty()
                ? "문서 없이 역할 정보만으로 생성한 초안입니다."
                : "문서 " + documents.size() + "건을 근거로 생성한 초안입니다.";

        if (!llmService.isEnabled()) {
            return fallback(name, targetRole, description, titles, planDays,
                    "AI 기능이 꺼져 있어 기본 골격으로 생성했습니다.");
        }

        String raw;
        try {
            raw = llmService.generateTemplateItemsJson(targetRole, request.department(), planDays, snippets);
        } catch (ChatProviderException ex) {
            log.warn("템플릿 생성 LLM 호출 실패: workspaceId={}", workspaceId, ex);
            return fallback(name, targetRole, description, titles, planDays,
                    "AI 호출에 실패해 기본 골격으로 생성했습니다.");
        }

        List<TemplateItemRequest> items = parseItems(raw, planDays);
        if (items.size() < MIN_ITEMS) {
            log.warn("템플릿 생성 응답을 쓸 수 없음: workspaceId={}, 파싱된 항목={}", workspaceId, items.size());
            return fallback(name, targetRole, description, titles, planDays,
                    "AI 응답을 해석할 수 없어 기본 골격으로 생성했습니다.");
        }

        return new GeneratedTemplateResponse(
                name, targetRole, description, items, titles, true, null, llmService.modelName()
        );
    }

    /** 요청에 문서가 지정되면 그것만, 아니면 워크스페이스의 READY 문서 전체 */
    private List<DocumentEntity> resolveDocuments(UUID workspaceId, List<UUID> documentIds) {
        List<DocumentEntity> candidates;
        if (documentIds == null || documentIds.isEmpty()) {
            candidates = documentRepository
                    .findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, DocumentStatus.READY);
        } else {
            // 다른 워크스페이스 문서를 근거로 끌어오지 못하도록 소속과 상태를 다시 확인한다
            candidates = documentRepository.findAllById(documentIds).stream()
                    .filter(d -> d.getWorkspaceId().equals(workspaceId))
                    .filter(d -> d.getDeletedAt() == null)
                    .filter(d -> d.getStatus() == DocumentStatus.READY)
                    .toList();
        }
        return candidates.stream().limit(MAX_DOCUMENTS).toList();
    }

    /** 문서의 앞부분 청크를 이어 붙인다. 온보딩 계획은 문서 도입부(개요·목차)만으로도 대개 충분하다 */
    private String documentText(DocumentEntity document) {
        StringBuilder sb = new StringBuilder();
        sb.append("제목: ").append(document.getTitle()).append('\n');
        for (DocumentChunk chunk : chunkRepository.findByDocumentIdOrderByChunkIndexAsc(document.getId())) {
            if (sb.length() >= MAX_CHARS_PER_DOCUMENT) {
                break;
            }
            sb.append(chunk.getContent()).append('\n');
        }
        return truncate(sb.toString(), MAX_CHARS_PER_DOCUMENT);
    }

    /**
     * 모델 출력에서 items 를 꺼낸다. 형식이 어긋난 항목은 통째로 버리지 않고 하나씩 걸러 낸다.
     * 코드펜스를 붙여 오는 경우가 흔해 JSON 구간만 잘라 파싱한다.
     */
    private List<TemplateItemRequest> parseItems(String raw, int planDays) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        String json = extractJsonObject(raw);
        if (json == null) {
            return List.of();
        }

        JsonNode root;
        try {
            root = MAPPER.readTree(json);
        } catch (JacksonException ex) {
            log.warn("템플릿 생성 응답 JSON 파싱 실패", ex);
            return List.of();
        }

        JsonNode itemsNode = root.get("items");
        if (itemsNode == null || !itemsNode.isArray()) {
            return List.of();
        }

        List<TemplateItemRequest> items = new ArrayList<>();
        for (JsonNode node : itemsNode) {
            if (items.size() >= MAX_ITEMS) {
                break;
            }
            TemplateItemRequest item = toItem(node, planDays);
            if (item != null) {
                items.add(item);
            }
        }

        // dayIndex 순으로 정렬하고 sortOrder 를 다시 매긴다 (모델이 순서를 섞어 줄 수 있다)
        items.sort(Comparator.comparingInt(TemplateItemRequest::dayIndex));
        List<TemplateItemRequest> ordered = new ArrayList<>(items.size());
        for (int i = 0; i < items.size(); i++) {
            TemplateItemRequest item = items.get(i);
            ordered.add(new TemplateItemRequest(
                    item.dayIndex(), item.type(), item.title(), item.description(), i));
        }
        return ordered;
    }

    /** 한 항목을 검증해 변환한다. 쓸 수 없으면 null */
    private TemplateItemRequest toItem(JsonNode node, int planDays) {
        if (node == null || !node.isObject()) {
            return null;
        }
        String title = text(node, "title");
        if (title == null || title.isBlank()) {
            return null;
        }

        PlanItemType type = parseType(text(node, "type"));
        if (type == null) {
            return null;
        }

        JsonNode dayNode = node.get("dayIndex");
        if (dayNode == null || !dayNode.canConvertToInt()) {
            return null;
        }
        int day = dayNode.asInt();
        if (day < 1 || day > planDays) {
            return null;
        }

        String description = text(node, "description");
        return new TemplateItemRequest(
                day,
                type,
                truncate(title.trim(), 200),
                description == null ? null : truncate(description.trim(), 500),
                null
        );
    }

    private static PlanItemType parseType(String raw) {
        if (raw == null) {
            return null;
        }
        try {
            return PlanItemType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asString();
    }

    /** 코드펜스나 앞뒤 설명이 섞여 와도 첫 '{' 부터 마지막 '}' 까지를 JSON 으로 본다 */
    private static String extractJsonObject(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        return raw.substring(start, end + 1);
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    private String defaultName(UserRole targetRole, String department) {
        String rolePart = switch (targetRole) {
            case OWNER -> "소유자";
            case ADMIN -> "관리자";
            case MANAGER -> "관리 담당자";
            case MEMBER -> "구성원";
            case NEW_HIRE -> "신입 구성원";
        };
        if (department != null && !department.isBlank()) {
            return department.trim() + " " + rolePart + " 온보딩";
        }
        return rolePart + " 온보딩";
    }

    /**
     * AI 를 쓸 수 없을 때의 기본 골격.
     * 역할과 무관하게 개발 업무를 전제하지 않도록, 어느 직군에나 성립하는 항목만 넣는다.
     */
    private GeneratedTemplateResponse fallback(
            String name,
            UserRole targetRole,
            String description,
            List<String> sourceDocuments,
            int planDays,
            String reason
    ) {
        int mid = Math.max(2, planDays / 2);
        List<TemplateItemRequest> items = new ArrayList<>();
        int order = 0;
        items.add(new TemplateItemRequest(1, PlanItemType.CHECKLIST,
                "계정 및 도구 접근 확인", "메일·메신저·업무 시스템 로그인 확인", order++));
        items.add(new TemplateItemRequest(1, PlanItemType.PERSON,
                "온보딩 담당자 첫 미팅", "담당자와 인사하고 첫 주 일정 확인", order++));
        items.add(new TemplateItemRequest(2, PlanItemType.CHECKLIST,
                "팀 목표와 내 역할 파악", "담당 업무 범위와 기대치를 문서로 확인", order++));
        items.add(new TemplateItemRequest(Math.min(7, planDays), PlanItemType.CHECKLIST,
                "첫 주 회고 작성", "배운 점과 막힌 점 정리", order++));
        items.add(new TemplateItemRequest(mid, PlanItemType.PRACTICE,
                "담당 업무 일부 직접 수행", "담당자 리뷰를 받아 완료", order++));
        items.add(new TemplateItemRequest(planDays, PlanItemType.PRACTICE,
                "첫 독립 업무 완수", "도움 없이 처음부터 끝까지 처리한 업무 기록", order));
        return new GeneratedTemplateResponse(
                name, targetRole, description, items, sourceDocuments, false, reason, null
        );
    }
}
