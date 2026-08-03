package com.onboardos.onboarding.dashboard;

import com.onboardos.onboarding.dashboard.dto.DashboardResponse;
import com.onboardos.onboarding.global.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Dashboard")
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "신입 대시보드 집계 (오늘 할 일 + 진행률 + 계획 요약)")
    @GetMapping("/me")
    public DashboardResponse me(@RequestHeader("X-Workspace-Id") UUID workspaceId) {
        return dashboardService.me(SecurityUtils.currentUser(), workspaceId);
    }
}
