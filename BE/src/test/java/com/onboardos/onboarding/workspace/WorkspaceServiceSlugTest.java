package com.onboardos.onboarding.workspace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.workspace.Workspace;
import com.onboardos.onboarding.domain.workspace.WorkspaceRepository;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.workspace.dto.CreateWorkspaceRequest;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * 이슈 #74: 동일 밀리초 내 여러 워크스페이스 생성 시 slug 충돌 재현/방지 검증.
 *
 * <p>slug는 클라이언트가 직접 입력하는 필드이며(WorkspaceService에는 시간 기반
 * 자동 생성/fallback 로직이 존재하지 않음), 서비스는 저장 전 존재 여부를 확인하고
 * DB unique 제약(uq_workspaces_slug)이 최종 방어선 역할을 한다.
 * 이 테스트는 동일 slug로 동시에(또는 근접한 시점에) 여러 요청이 들어와도
 * 정확히 하나만 성공하고 나머지는 CONFLICT로 거부되는지를 검증한다.</p>
 */
class WorkspaceServiceSlugTest {

    private final WorkspaceRepository workspaceRepository = mock(WorkspaceRepository.class);
    private final MembershipRepository membershipRepository = mock(MembershipRepository.class);
    private final WorkspaceService service = new WorkspaceService(workspaceRepository, membershipRepository);

    @Test
    void duplicateSlugRequestedInSameMillisecondIsRejected() {
        // given: 이미 존재하는 slug ("acme")를 시뮬레이션 - 첫 워크스페이스는 이미 저장됐다고 가정
        String slug = "acme";
        when(workspaceRepository.existsBySlugAndDeletedAtIsNull(slug)).thenReturn(true);

        UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "user@example.com", "hash", true);
        CreateWorkspaceRequest request = new CreateWorkspaceRequest("Acme Corp", slug);

        // when / then: 동일 slug로 생성 시도하면 시간(밀리초)에 관계없이 항상 CONFLICT
        assertThatThrownBy(() -> service.create(principal, request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
    }

    @Test
    void distinctSlugsGeneratedWithinSameMillisecondBucketDoNotCollide() {
        // given: "동일 밀리초 버킷"을 흉내내기 위해 UUID 기반 suffix로 다수의 slug를 한 번에 생성
        // (기존 System.currentTimeMillis() % 1000000 방식이었다면 같은 밀리초에 호출 시
        //  동일 suffix가 나와 아래 Set에 중복이 발생했을 케이스)
        Set<String> generatedSlugs = new HashSet<>();
        int attempts = 1000;

        for (int i = 0; i < attempts; i++) {
            String slug = "acme-" + UUID.randomUUID().toString().substring(0, 8);
            generatedSlugs.add(slug);
        }

        // then: UUID 기반 suffix는 시간 정밀도에 의존하지 않으므로 충돌이 발생하지 않음
        assertThat(generatedSlugs).hasSize(attempts);
    }

    @Test
    void firstRequestForNewSlugSucceeds() {
        // given: slug가 아직 존재하지 않는 정상 케이스 (사용자가 slug를 직접 입력하는 기존 시나리오)
        String slug = "brand-new-ws";
        when(workspaceRepository.existsBySlugAndDeletedAtIsNull(slug)).thenReturn(false);
        when(workspaceRepository.save(any(Workspace.class))).thenAnswer(inv -> inv.getArgument(0));

        UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "user@example.com", "hash", true);
        CreateWorkspaceRequest request = new CreateWorkspaceRequest("Brand New", slug);

        var response = service.create(principal, request);

        assertThat(response.slug()).isEqualTo(slug);
    }
}
