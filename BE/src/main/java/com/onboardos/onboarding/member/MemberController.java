package com.onboardos.onboarding.member;

import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.security.SecurityUtils;
import com.onboardos.onboarding.global.web.PageResponse;
import com.onboardos.onboarding.member.dto.AcceptInvitationResponse;
import com.onboardos.onboarding.member.dto.CreateInvitationRequest;
import com.onboardos.onboarding.member.dto.InvitationResponse;
import com.onboardos.onboarding.member.dto.MemberResponse;
import com.onboardos.onboarding.member.dto.UpdateMemberRequest;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Members")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @Operation(summary = "멤버 초대")
    @PostMapping("/members/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationResponse invite(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @Valid @RequestBody CreateInvitationRequest request
    ) {
        return memberService.invite(SecurityUtils.currentUser(), workspaceId, request);
    }

    @Operation(summary = "초대 수락")
    @PostMapping("/members/invitations/{token}/accept")
    public AcceptInvitationResponse accept(@PathVariable String token) {
        return memberService.accept(SecurityUtils.currentUser(), token);
    }

    @Operation(summary = "멤버 목록")
    @GetMapping("/members")
    public PageResponse<MemberResponse> list(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) UserRole role
    ) {
        return PageResponse.of(memberService.list(SecurityUtils.currentUser(), workspaceId, role, page, size));
    }

    @Operation(summary = "멤버 역할/상태 변경")
    @PatchMapping("/members/{memberId}")
    public MemberResponse update(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID memberId,
            @Valid @RequestBody UpdateMemberRequest request
    ) {
        return memberService.update(SecurityUtils.currentUser(), workspaceId, memberId, request);
    }
}
