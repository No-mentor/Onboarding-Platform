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
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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

        if (invitationRepository.existsByWorkspaceIdAndEmailAndStatus(workspaceId, email, InvitationStatus.PENDING)) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 대기 중인 초대가 있습니다.");
        }

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
        mailService.sendInvitationEmail(
                invitation.getEmail(),
                workspace == null ? "OnboardOS" : workspace.getName(),
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
