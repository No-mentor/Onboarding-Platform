package com.onboardos.onboarding.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.audit.AuditLog;
import com.onboardos.onboarding.domain.audit.AuditLogRepository;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.MembershipStatus;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class AuditServiceTest {
    private final AuditLogRepository repository = mock(AuditLogRepository.class);
    private final MembershipRepository memberships = mock(MembershipRepository.class);
    private final AuditService service = new AuditService(repository, new WorkspaceAccessService(memberships));
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID requesterId = UUID.randomUUID();

    @Test void ownerAndAdminCanQuery() {
        for (UserRole role : List.of(UserRole.OWNER, UserRole.ADMIN)) {
            allow(role);
            PageRequest pageable = PageRequest.of(0, 50);
            when(repository.findFiltered(workspaceId, null, null, null, null, pageable))
                    .thenReturn(new PageImpl<>(List.of(log()), pageable, 1));
            var response = service.list(workspaceId, requesterId, 0, 50, null, "  ", null, null);
            assertThat(response.items()).hasSize(1);
            assertThat(response.totalElements()).isEqualTo(1);
        }
    }

    @Test void managerMemberAndNewHireAreForbidden() {
        for (UserRole role : List.of(UserRole.MANAGER, UserRole.MEMBER, UserRole.NEW_HIRE)) {
            allow(role);
            assertError(() -> service.list(workspaceId, requesterId, 0, 50, null, null, null, null),
                    ErrorCode.FORBIDDEN);
        }
        verifyNoInteractions(repository);
    }

    @Test void inactiveMemberIsForbidden() {
        Membership membership = membership(UserRole.OWNER);
        membership.changeStatus(MembershipStatus.DISABLED);
        when(memberships.findByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, requesterId))
                .thenReturn(Optional.of(membership));
        assertError(() -> service.list(workspaceId, requesterId, 0, 50, null, null, null, null),
                ErrorCode.WORKSPACE_MISMATCH);
        verifyNoInteractions(repository);
    }

    @Test void trimsEventTypeAndPassesAllFiltersToDatabase() {
        allow(UserRole.OWNER);
        UUID actorId = UUID.randomUUID();
        Instant from = Instant.parse("2026-08-11T00:00:00Z");
        Instant to = Instant.parse("2026-08-11T12:00:00Z");
        PageRequest pageable = PageRequest.of(1, 10);
        when(repository.findFiltered(workspaceId, actorId, "CHAT_QUERY", from, to, pageable))
                .thenReturn(new PageImpl<>(List.of(), pageable, 11));
        service.list(workspaceId, requesterId, 1, 10, actorId, "  CHAT_QUERY  ", from, to);
        verify(repository).findFiltered(workspaceId, actorId, "CHAT_QUERY", from, to, pageable);
    }

    @Test void rejectsInvalidPaginationRangeAndEventType() {
        assertValidation(() -> service.list(workspaceId, requesterId, -1, 50, null, null, null, null));
        assertValidation(() -> service.list(workspaceId, requesterId, 0, 0, null, null, null, null));
        assertValidation(() -> service.list(workspaceId, requesterId, 0, 101, null, null, null, null));
        assertValidation(() -> service.list(workspaceId, requesterId, 0, 50, null, "x".repeat(51), null, null));
        Instant from = Instant.parse("2026-08-12T00:00:00Z");
        Instant to = Instant.parse("2026-08-11T00:00:00Z");
        assertValidation(() -> service.list(workspaceId, requesterId, 0, 50, null, null, from, to));
    }

    private void assertValidation(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertError(call, ErrorCode.VALIDATION_ERROR);
    }
    private void assertError(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, ErrorCode code) {
        assertThatThrownBy(call).isInstanceOfSatisfying(BusinessException.class,
                exception -> assertThat(exception.getErrorCode()).isEqualTo(code));
    }
    private void allow(UserRole role) {
        when(memberships.findByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, requesterId))
                .thenReturn(Optional.of(membership(role)));
    }
    private Membership membership(UserRole role) {
        return Membership.create(workspaceId, requesterId, role, null, null, null);
    }
    private AuditLog log() {
        return AuditLog.of(workspaceId, requesterId, "CHAT_QUERY", "CHAT", UUID.randomUUID(),
                "SUCCESS", "internal", Map.of("key", "value"));
    }
}
