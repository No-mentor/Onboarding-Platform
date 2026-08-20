package com.onboardos.onboarding.template.dto;

import com.onboardos.onboarding.domain.user.UserRole;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/**
 * 업로드된 문서를 근거로 온보딩 템플릿 초안을 만들어 달라는 요청.
 * 저장하지 않고 초안만 돌려주므로, 사용자가 검토·수정한 뒤 POST /templates 로 저장한다.
 */
public record GenerateTemplateRequest(
        /** 이 템플릿을 적용할 역할. 비우면 NEW_HIRE */
        UserRole targetRole,

        /** 부서명. 프롬프트에 반영되어 부서 맥락에 맞는 항목이 나온다 */
        @Size(max = 100) String department,

        /** 근거로 쓸 문서. 비우면 워크스페이스의 READY 문서를 모두 사용한다 */
        List<UUID> documentIds,

        /** 계획 기간(일). 비우면 30 */
        @Min(7) @Max(30) Integer planDays
) {
    public UserRole targetRoleOrDefault() {
        return targetRole == null ? UserRole.NEW_HIRE : targetRole;
    }

    public int planDaysOrDefault() {
        return planDays == null ? 30 : planDays;
    }
}
