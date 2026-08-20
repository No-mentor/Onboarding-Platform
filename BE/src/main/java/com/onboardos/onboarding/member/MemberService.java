package com.onboardos.onboarding.member;

import com.onboardos.onboarding.domain.invitation.Invitation;
import com.onboardos.onboarding.domain.invitation.InvitationRepository;
import com.onboardos.onboarding.domain.invitation.InvitationStatus;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.MembershipStatus;
import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.domain.workspace.Workspace;
import com.onboardos.onboarding.domain.workspace.WorkspaceRepository;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.mail.MailService;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.member.dto.AcceptInvitationResponse;
import com.onboardos.onboarding.member.dto.CreateInvitationRequest;
import com.onboardos.onboarding.member.dto.InvitationListItemResponse;
import com.onboardos.onboarding.member.dto.InvitationPreviewResponse;
import com.onboardos.onboarding.member.dto.InvitationResponse;
import com.onboardos.onboarding.member.dto.MemberResponse;
import com.onboardos.onboarding.member.dto.UpdateMemberRequest;
import com.onboardos.onboarding.onboarding.OnboardingPlanService;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {

    private final InvitationRepository invitationRepository;
    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final MemberManagementPolicy memberManagementPolicy;
    private final OnboardingPlanService onboardingPlanService;
    private final MailService mailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public MemberService(
            InvitationRepository invitationRepository,
            MembershipRepository membershipRepository,
            UserRepository userRepository,
            WorkspaceRepository workspaceRepository,
            WorkspaceAccessService workspaceAccessService,
            MemberManagementPolicy memberManagementPolicy,
            @Lazy OnboardingPlanService onboardingPlanService,
            MailService mailService
    ) {
        this.invitationRepository = invitationRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.memberManagementPolicy = memberManagementPolicy;
        this.onboardingPlanService = onboardingPlanService;
        this.mailService = mailService;
    }

    @Transactional
    public InvitationResponse invite(UserPrincipal principal, UUID workspaceId, CreateInvitationRequest request) {
        Membership actor = workspaceAccessService.requireRoles(
                workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        UserRole role = request.role() == null ? UserRole.NEW_HIRE : request.role();
        memberManagementPolicy.validateInvitation(actor, role);

        String email = request.email().trim().toLowerCase();

        userRepository.findByEmailAndDeletedAtIsNull(email).ifPresent(user -> {
            if (membershipRepository.existsByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, user.getId())) {
                throw new BusinessException(ErrorCode.CONFLICT, "이미 워크스페이스 멤버입니다.");
            }
        });

        // 기한이 지난 초대는 아무도 수락하지 않으면 PENDING 으로 남는다.
        // 그대로 두면 같은 주소로 영구히 재초대할 수 없으므로, 여기서 EXPIRED 로 정리하고 통과시킨다
        invitationRepository.findByWorkspaceIdAndEmailAndStatus(workspaceId, email, InvitationStatus.PENDING)
                .ifPresent(pending -> {
                    if (pending.isExpired()) {
                        pending.markExpired();
                    } else {
                        throw new BusinessException(ErrorCode.CONFLICT, "이미 대기 중인 초대가 있습니다.");
                    }
                });

        Invitation invitation = Invitation.create(
                workspaceId,
                email,
                role,
                request.department(),
                request.careerLevel(),
                request.title(),
                principal.getId(),
                Instant.now().plus(7, ChronoUnit.DAYS),
                generateToken()
        );
        invitationRepository.save(invitation);

        Workspace workspace = workspaceRepository.findByIdAndDeletedAtIsNull(workspaceId).orElse(null);
        String inviterName = userRepository.findById(principal.getId())
                .map(User::getName)
                .orElse(null);
        mailService.sendInvitationEmail(
                invitation.getEmail(),
                workspace == null ? "MenTalk" : workspace.getName(),
                inviterName,
                invitation.getRole(),
                invitation.getExpiresAt(),
                invitation.getToken()
        );

        return new InvitationResponse(
                invitation.getId(),
                invitation.getEmail(),
                invitation.getRole(),
                invitation.getToken(),
                invitation.getExpiresAt(),
                invitation.getStatus()
        );
    }

    /**
     * 초대 링크를 연 사람에게 로그인 전에 보여 줄 정보.
     * 토큰을 아는 것 자체가 인증이므로 로그인을 요구하지 않는다. (SecurityConfig 에서 GET 만 permitAll)
     */
    @Transactional(readOnly = true)
    public InvitationPreviewResponse preview(String token) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "초대를 찾을 수 없습니다."));

        String workspaceName = workspaceRepository.findByIdAndDeletedAtIsNull(invitation.getWorkspaceId())
                .map(Workspace::getName)
                .orElse("MenTalk");
        String inviterName = invitation.getInvitedBy() == null ? null
                : userRepository.findById(invitation.getInvitedBy())
                        .map(User::getName)
                        .orElse(null);

        String blockedReason = acceptBlockedReason(invitation);

        return new InvitationPreviewResponse(
                invitation.getEmail(),
                workspaceName,
                inviterName,
                invitation.getRole(),
                invitation.getDepartment(),
                invitation.getTitle(),
                invitation.getExpiresAt(),
                invitation.getStatus(),
                blockedReason == null,
                blockedReason
        );
    }

    /**
     * 워크스페이스에 보낸 초대 목록. 멤버 목록과 같은 권한으로 읽는다.
     * 수락 전 초대는 memberships 에 없으므로 이 목록으로만 확인할 수 있다.
     */
    @Transactional(readOnly = true)
    public Page<InvitationListItemResponse> listInvitations(
            UserPrincipal principal,
            UUID workspaceId,
            InvitationStatus statusFilter,
            int page,
            int size
    ) {
        workspaceAccessService.requireRoles(
                workspaceId,
                principal.getId(),
                UserRole.OWNER,
                UserRole.ADMIN,
                UserRole.MANAGER
        );

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<Invitation> invitations = statusFilter == null
                ? invitationRepository.findByWorkspaceId(workspaceId, pageable)
                : invitationRepository.findByWorkspaceIdAndStatus(workspaceId, statusFilter, pageable);

        Map<UUID, String> inviterNames = userRepository.findAllById(
                invitations.getContent().stream()
                        .map(Invitation::getInvitedBy)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList()
        ).stream().collect(Collectors.toMap(User::getId, User::getName));

        return invitations.map(invitation -> new InvitationListItemResponse(
                invitation.getId(),
                invitation.getEmail(),
                invitation.getRole(),
                invitation.getDepartment(),
                invitation.getCareerLevel(),
                invitation.getTitle(),
                invitation.getStatus(),
                invitation.getStatus() == InvitationStatus.PENDING && invitation.isExpired(),
                invitation.getInvitedBy() == null ? null : inviterNames.get(invitation.getInvitedBy()),
                invitation.getExpiresAt(),
                invitation.getCreatedAt()
        ));
    }

    /**
     * 초대 취소. 잘못된 주소로 보냈을 때 같은 주소로 다시 초대할 수 있게 해 준다.
     * 이미 수락한 초대는 취소할 수 없다 (멤버 관리로 처리할 일이다).
     */
    @Transactional
    public void revokeInvitation(UserPrincipal principal, UUID workspaceId, UUID invitationId) {
        workspaceAccessService.requireRoles(
                workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);

        Invitation invitation = requireInvitationInWorkspace(workspaceId, invitationId);
        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 수락된 초대는 취소할 수 없습니다.");
        }
        invitation.markRevoked();
    }

    /**
     * 초대 재발송. 메일이 유실됐거나 기한이 지났을 때 쓴다.
     * 토큰은 그대로 두고 기한만 다시 7일로 늘린다 (이미 받은 메일의 링크도 계속 살아 있도록).
     */
    @Transactional
    public InvitationResponse resendInvitation(UserPrincipal principal, UUID workspaceId, UUID invitationId) {
        workspaceAccessService.requireRoles(
                workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);

        Invitation invitation = requireInvitationInWorkspace(workspaceId, invitationId);
        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 수락된 초대입니다.");
        }
        invitation.renew(Instant.now().plus(7, ChronoUnit.DAYS));

        Workspace workspace = workspaceRepository.findByIdAndDeletedAtIsNull(workspaceId).orElse(null);
        String inviterName = userRepository.findById(principal.getId())
                .map(User::getName)
                .orElse(null);
        mailService.sendInvitationEmail(
                invitation.getEmail(),
                workspace == null ? "MenTalk" : workspace.getName(),
                inviterName,
                invitation.getRole(),
                invitation.getExpiresAt(),
                invitation.getToken()
        );

        return new InvitationResponse(
                invitation.getId(),
                invitation.getEmail(),
                invitation.getRole(),
                invitation.getToken(),
                invitation.getExpiresAt(),
                invitation.getStatus()
        );
    }

    private Invitation requireInvitationInWorkspace(UUID workspaceId, UUID invitationId) {
        return invitationRepository.findById(invitationId)
                .filter(inv -> inv.getWorkspaceId().equals(workspaceId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "초대를 찾을 수 없습니다."));
    }

    /** 수락을 막는 이유. 수락 가능하면 null */
    private String acceptBlockedReason(Invitation invitation) {
        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            return "이미 수락한 초대입니다.";
        }
        if (invitation.getStatus() == InvitationStatus.REVOKED) {
            return "철회된 초대입니다.";
        }
        if (invitation.getStatus() == InvitationStatus.EXPIRED || invitation.isExpired()) {
            return "초대가 만료되었습니다. 초대한 사람에게 재발송을 요청해 주세요.";
        }
        return null;
    }

    @Transactional
    public AcceptInvitationResponse accept(UserPrincipal principal, String token) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "초대를 찾을 수 없습니다."));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new BusinessException(ErrorCode.GONE, "이미 처리되었거나 취소된 초대입니다.");
        }
        if (invitation.isExpired()) {
            invitation.markExpired();
            throw new BusinessException(ErrorCode.GONE, "초대가 만료되었습니다.");
        }

        User user = userRepository.findById(principal.getId())
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

        if (!user.getEmail().equalsIgnoreCase(invitation.getEmail())) {
            throw new BusinessException(
                    ErrorCode.FORBIDDEN,
                    "초대된 이메일(" + invitation.getEmail() + ")로 로그인한 계정만 수락할 수 있습니다."
            );
        }

        if (membershipRepository.existsByWorkspaceIdAndUserIdAndDeletedAtIsNull(
                invitation.getWorkspaceId(), user.getId())) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 멤버입니다.");
        }

        Membership membership = Membership.create(
                invitation.getWorkspaceId(),
                user.getId(),
                invitation.getRole(),
                invitation.getDepartment(),
                invitation.getCareerLevel(),
                invitation.getTitle()
        );
        membershipRepository.save(membership);
        invitation.markAccepted();

        UUID planId = null;
        if (invitation.getRole() == UserRole.NEW_HIRE) {
            planId = onboardingPlanService.generateForUser(
                    invitation.getWorkspaceId(),
                    user.getId(),
                    false
            ).planId();
        }

        return new AcceptInvitationResponse(
                invitation.getWorkspaceId(),
                membership.getRole(),
                membership.getId(),
                planId
        );
    }

    @Transactional(readOnly = true)
    public Page<MemberResponse> list(
            UserPrincipal principal,
            UUID workspaceId,
            UserRole roleFilter,
            int page,
            int size
    ) {
        workspaceAccessService.requireRoles(
                workspaceId,
                principal.getId(),
                UserRole.OWNER,
                UserRole.ADMIN,
                UserRole.MANAGER
        );

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<Membership> memberships = roleFilter == null
                ? membershipRepository.findByWorkspaceIdAndDeletedAtIsNull(workspaceId, pageable)
                : membershipRepository.findByWorkspaceIdAndRoleAndDeletedAtIsNull(workspaceId, roleFilter, pageable);

        Map<UUID, User> users = userRepository.findAllById(
                memberships.getContent().stream().map(Membership::getUserId).toList()
        ).stream().collect(Collectors.toMap(User::getId, Function.identity()));

        return memberships.map(m -> {
            User u = users.get(m.getUserId());
            return new MemberResponse(
                    m.getId(),
                    m.getUserId(),
                    u == null ? null : u.getName(),
                    u == null ? null : u.getEmail(),
                    m.getRole(),
                    m.getStatus(),
                    m.getDepartment(),
                    m.getCareerLevel(),
                    m.getTitle()
            );
        });
    }

    @Transactional
    public MemberResponse update(
            UserPrincipal principal,
            UUID workspaceId,
            UUID memberId,
            UpdateMemberRequest request
    ) {
        Membership actor = workspaceAccessService.requireRoles(
                workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);

        workspaceRepository.findByIdForMemberUpdate(workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORKSPACE_MISMATCH));

        Membership membership = membershipRepository.findById(memberId)
                .filter(m -> m.getWorkspaceId().equals(workspaceId) && m.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "멤버를 찾을 수 없습니다."));

        memberManagementPolicy.validateUpdate(actor, membership, request.role(), request.status());

        boolean removesActiveOwner = membership.getRole() == UserRole.OWNER
                && membership.getStatus() == MembershipStatus.ACTIVE
                && ((request.role() != null && request.role() != UserRole.OWNER)
                    || (request.status() != null && request.status() != MembershipStatus.ACTIVE));

        if (removesActiveOwner) {
            long activeOwners = membershipRepository.countByWorkspaceIdAndRoleAndStatusAndDeletedAtIsNull(
                    workspaceId, UserRole.OWNER, MembershipStatus.ACTIVE
            );
            if (activeOwners <= 1) {
                throw new BusinessException(ErrorCode.CONFLICT, "최소 1명의 OWNER는 유지되어야 합니다.");
            }
        }

        if (request.role() != null) {
            membership.changeRole(request.role());
        }
        if (request.status() != null) {
            membership.changeStatus(request.status());
        }

        User u = userRepository.findById(membership.getUserId()).orElse(null);
        return new MemberResponse(
                membership.getId(),
                membership.getUserId(),
                u == null ? null : u.getName(),
                u == null ? null : u.getEmail(),
                membership.getRole(),
                membership.getStatus(),
                membership.getDepartment(),
                membership.getCareerLevel(),
                membership.getTitle()
        );
    }

    private String generateToken() {
        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
