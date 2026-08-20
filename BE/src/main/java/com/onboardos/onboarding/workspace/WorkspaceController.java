package com.onboardos.onboarding.workspace;

import com.onboardos.onboarding.global.security.SecurityUtils;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.workspace.dto.CreateWorkspaceRequest;
import com.onboardos.onboarding.workspace.dto.UpdateWorkspaceRequest;
import com.onboardos.onboarding.workspace.dto.WorkspaceListResponse;
import com.onboardos.onboarding.workspace.dto.WorkspaceResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Workspace")
@RestController
@RequestMapping("/api/v1/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @Operation(summary = "Workspace 생성 (생성자 = OWNER)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceResponse create(@Valid @RequestBody CreateWorkspaceRequest request) {
        UserPrincipal principal = SecurityUtils.currentUser();
        return workspaceService.create(principal, request);
    }

    @Operation(summary = "내 Workspace 목록")
    @GetMapping("/me")
    public WorkspaceListResponse me() {
        UserPrincipal principal = SecurityUtils.currentUser();
        return workspaceService.myWorkspaces(principal);
    }

    @Operation(summary = "Workspace 이름 수정")
    @PatchMapping("/{workspaceId}")
    public WorkspaceResponse update(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody UpdateWorkspaceRequest request
    ) {
        UserPrincipal principal = SecurityUtils.currentUser();
        return workspaceService.update(principal, workspaceId, request);
    }
}
