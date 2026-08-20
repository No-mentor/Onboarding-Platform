import type { TemplateResponse } from './api';

/**
 * 서버가 거부하는 조합을 고를 수 없게, 실제로 쓸 수 있는 템플릿만 남긴다.
 *
 * - 역할 불일치: "대상 역할과 호환되지 않는 템플릿입니다" (400)
 * - documentId 가 없는 DOCUMENT 항목이 있는 옛 템플릿:
 *   "선택한 템플릿에 대상 사용자가 접근할 수 없는 문서가 있습니다" (400)
 *
 * 주의: `role` 은 반드시 "이 템플릿이 적용될 대상 사용자"의 역할이어야 한다.
 * 계획을 생성/재생성하는 관리자의 역할이 아니다 — 관리자가 인턴(NEW_HIRE)에게 적용할 때
 * 관리자 자신의 역할로 필터링하면, 정작 인턴에게 맞는 템플릿이 걸러지거나
 * 인턴에게 못 쓰는 템플릿이 선택 가능한 것처럼 보인다.
 * (자기 계획을 스스로 만드는 화면에서는 로그인한 사용자 = 대상 사용자이므로 그대로 자기 역할을 쓰면 된다)
 */
export function selectableTemplates(
  templates: TemplateResponse[],
  targetRole: string | undefined
): TemplateResponse[] {
  return templates.filter(t => {
    if (t.targetRole && targetRole && t.targetRole !== targetRole) return false;
    const hasUnlinkedDocument = (t.items ?? []).some(
      i => i.type === 'DOCUMENT' && !i.documentId
    );
    return !hasUnlinkedDocument;
  });
}
