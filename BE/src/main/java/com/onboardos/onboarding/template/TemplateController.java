package com.onboardos.onboarding.template;

import com.onboardos.onboarding.global.security.SecurityUtils;
import com.onboardos.onboarding.template.dto.CreateTemplateRequest;
import com.onboardos.onboarding.template.dto.TemplateResponse;
import com.onboardos.onboarding.template.dto.UpdateTemplateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Templates")
@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @Operation(summary = "템플릿 목록")
    @GetMapping
    public Map<String, List<TemplateResponse>> list(@RequestHeader("X-Workspace-Id") UUID workspaceId) {
        return Map.of("items", templateService.list(SecurityUtils.currentUser(), workspaceId));
    }

    @Operation(summary = "템플릿 상세")
    @GetMapping("/{templateId}")
    public TemplateResponse get(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID templateId
    ) {
        return templateService.get(SecurityUtils.currentUser(), workspaceId, templateId);
    }

    @Operation(summary = "템플릿 생성")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TemplateResponse create(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @Valid @RequestBody CreateTemplateRequest request
    ) {
        return templateService.create(SecurityUtils.currentUser(), workspaceId, request);
    }

    @Operation(summary = "템플릿 수정")
    @PatchMapping("/{templateId}")
    public TemplateResponse update(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID templateId,
            @Valid @RequestBody UpdateTemplateRequest request
    ) {
        return templateService.update(SecurityUtils.currentUser(), workspaceId, templateId, request);
    }

    @Operation(summary = "템플릿 삭제(soft)")
    @DeleteMapping("/{templateId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID templateId
    ) {
        templateService.delete(SecurityUtils.currentUser(), workspaceId, templateId);
    }
}
