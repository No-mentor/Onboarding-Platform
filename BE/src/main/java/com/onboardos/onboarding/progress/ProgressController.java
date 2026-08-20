package com.onboardos.onboarding.progress;

import com.onboardos.onboarding.global.security.SecurityUtils;
import com.onboardos.onboarding.global.web.PageResponse;
import com.onboardos.onboarding.progress.dto.AdminProgressDetailResponse;
import com.onboardos.onboarding.progress.dto.AdminProgressItemResponse;
import com.onboardos.onboarding.progress.dto.MyProgressResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Progress")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @Operation(summary = "내 진행률·병목")
    @GetMapping("/progress/me")
    public MyProgressResponse myProgress(@RequestHeader("X-Workspace-Id") UUID workspaceId) {
        return progressService.myProgress(SecurityUtils.currentUser(), workspaceId);
    }

    @Operation(summary = "관리자: 신입 진행 현황 목록")
    @GetMapping("/admin/progress")
    public PageResponse<AdminProgressItemResponse> adminList(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return progressService.adminList(SecurityUtils.currentUser(), workspaceId, page, size);
    }

    @Operation(summary = "관리자: 신입 상세 진행/인사이트")
    @GetMapping("/admin/progress/{userId}")
    public AdminProgressDetailResponse adminDetail(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID userId
    ) {
        return progressService.adminDetail(SecurityUtils.currentUser(), workspaceId, userId);
    }
}
