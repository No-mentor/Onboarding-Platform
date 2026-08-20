package com.onboardos.onboarding.template.dto;

import com.onboardos.onboarding.domain.user.UserRole;
import java.util.List;

/**
 * 템플릿 초안. 저장되지 않은 상태이며, items 는 POST /templates 의 items 와 같은 모양이라
 * 화면에서 수정한 뒤 그대로 저장 요청에 넣을 수 있다.
 */
public record GeneratedTemplateResponse(
        String name,
        UserRole targetRole,
        String description,
        List<TemplateItemRequest> items,

        /** 근거로 사용한 문서 제목. 사용자가 무엇을 보고 만든 초안인지 확인할 수 있어야 한다 */
        List<String> sourceDocuments,

        /** true 면 LLM 이 만든 초안, false 면 AI 를 쓸 수 없어 기본 골격으로 대체한 것 */
        boolean aiGenerated,

        /** aiGenerated=false 인 이유. 정상일 때는 null */
        String fallbackReason,

        /** 사용한 모델명. aiGenerated=false 면 null */
        String model
) {
}
