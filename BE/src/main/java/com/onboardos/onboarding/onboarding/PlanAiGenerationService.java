package com.onboardos.onboarding.onboarding;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.core.JacksonException;
import com.onboardos.onboarding.ai.LlmService;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.plan.PlanItemType;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.workspace.Workspace;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class PlanAiGenerationService {
    private static final int MAX_ITEMS = 60;
    private final LlmService llmService;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public PlanAiGenerationService(LlmService llmService) {
        this.llmService = llmService;
    }

    public record Item(int dayIndex, PlanItemType type, String title, String description,
                       Integer estimatedMinutes, UUID documentId, int sortOrder) {}
    public record Result(String source, List<Item> items) {}

    public Result generate(Membership member, Workspace workspace, List<DocumentEntity> documents) {
        List<String> catalog = documents.stream()
                .map(d -> d.getId() + " | " + clean(d.getTitle()) + " | " + clean(d.getDescription()))
                .toList();
        if (llmService.isEnabled()) {
            try {
                String raw = llmService.generateOnboardingPlanJson(member.getRole(), member.getDepartment(),
                        member.getTitle(), member.getCareerLevel(), workspace.getName(), catalog);
                List<Item> parsed = parse(raw, documents);
                if (!parsed.isEmpty()) return new Result("AI", parsed);
            } catch (RuntimeException exception) {
                log.warn("AI onboarding plan generation failed safely: {}", exception.getClass().getSimpleName());
            }
        }
        return new Result("FALLBACK", fallback(member, documents));
    }

    private List<Item> parse(String raw, List<DocumentEntity> documents) {
        if (raw == null || raw.isBlank()) return List.of();
        JsonNode root;
        try {
            root = MAPPER.readTree(extractJson(raw));
        } catch (JacksonException exception) {
            return List.of();
        }
        JsonNode nodes = root.path("items");
        if (!nodes.isArray()) return List.of();
        Set<UUID> allowedDocs = documents.stream().map(DocumentEntity::getId).collect(java.util.stream.Collectors.toSet());
        Set<String> seen = new HashSet<>();
        List<Item> result = new ArrayList<>();
        for (JsonNode node : nodes) {
            if (result.size() >= MAX_ITEMS) break;
            int day = node.path("dayIndex").asInt(-1);
            String title = node.path("title").asText("").trim();
            int minutes = node.path("estimatedMinutes").asInt(-1);
            PlanItemType type;
            try { type = PlanItemType.valueOf(node.path("type").asText("")); }
            catch (IllegalArgumentException e) { continue; }
            if (day < 1 || day > 30 || title.isBlank() || minutes < 0 || minutes > 1440) continue;
            UUID documentId = null;
            if (type == PlanItemType.DOCUMENT) {
                try { documentId = UUID.fromString(node.path("documentId").asText("")); }
                catch (IllegalArgumentException e) { continue; }
                if (!allowedDocs.contains(documentId)) continue;
            }
            String key = day + "|" + type + "|" + title.toLowerCase();
            if (!seen.add(key)) continue;
            result.add(new Item(day, type, title, node.path("description").asText(null),
                    minutes, documentId, result.size()));
        }
        return result;
    }

    private static String extractJson(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        return start >= 0 && end > start ? raw.substring(start, end + 1) : raw;
    }

    private List<Item> fallback(Membership member, List<DocumentEntity> documents) {
        List<Item> result = new ArrayList<>();
        String role = member.getTitle() == null || member.getTitle().isBlank()
                ? member.getRole().name() : member.getTitle().trim();
        result.add(new Item(1, PlanItemType.CHECKLIST, role + " 온보딩 목표 확인",
                "담당자와 역할, 부서 목표 및 30일 기대 결과를 확인합니다.", 30, null, 0));
        result.add(new Item(1, PlanItemType.PERSON, "팀 담당자와 첫 미팅",
                "업무 범위와 협업 방식을 확인합니다.", 30, null, 1));
        int index = 0;
        for (DocumentEntity document : documents) {
            int day = documents.size() <= 1 ? 3 : 3 + (int) Math.round(22.0 * index / (documents.size() - 1));
            result.add(new Item(day, PlanItemType.DOCUMENT, document.getTitle() + " 학습",
                    "접근 가능한 업무 문서를 읽고 핵심 내용을 정리합니다.", 45, document.getId(), index + 2));
            index++;
        }
        result.add(new Item(30, PlanItemType.PRACTICE, role + " 첫 업무 회고",
                "30일 동안 학습한 내용을 실제 업무에 적용하고 다음 목표를 정합니다.", 60, null, index + 2));
        return result;
    }

    private static String clean(String value) {
        return value == null ? "" : value.replaceAll("[\\r\\n|]", " ").trim();
    }
}
