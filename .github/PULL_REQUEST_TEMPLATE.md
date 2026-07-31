## Summary

<!-- 무엇을 왜 바꾸는지 2~5문장. TTP/제품 원칙과 연결해 주세요. -->

## Related

- Issue: closes #
- Feature ID: F-xx (해당 없으면 N/A)
- Spec: <!-- PRD / 기능명세 섹션 / API path / ERD 테이블 -->

## Type of change

- [ ] 🐛 Bug fix
- [ ] ✨ Feature (MVP)
- [ ] 🔧 Refactor / chore
- [ ] 📄 Documentation
- [ ] 🔒 Security
- [ ] 🧪 Tests / CI

## Scope checklist (OnboardOS)

- [ ] TTP 게이트 통과 (이 변경이 적응 속도/생산성에 기여)
- [ ] Out of Scope 아님 (단순 RAG 챗봇 / LMS / 문서검색기 형태 아님)
- [ ] `workspace_id` 격리 유지 (교차 테넌트 접근 불가)
- [ ] RBAC / ACL 고려 (문서·AI면 Permission Check)
- [ ] AI 응답이면 **Citation** 필드/ UI 포함 (없으면 명시적 empty + 고지)
- [ ] AI/권한 관련이면 **Audit Log** 기록
- [ ] API 변경 시 명세(`docs/OnboardOS_API_명세서.pdf`) 또는 OpenAPI 정합
- [ ] 스키마 변경 시 ERD(`docs/OnboardOS_ERD.md`) / 마이그레이션 반영

## Test plan

- [ ] Happy path
- [ ] 권한 거부 / 타 Workspace 접근 (해당 시)
- [ ] 관련 단위·통합 테스트 또는 수동 시나리오 (아래에 절차)

```text
1.
2.
3.
```

## Screenshots / Demo

<!-- UI 변경 시 before/after 또는 데모 플로우 단계 -->

## Risk & rollback

- Risk:
- Rollback:

## Checklist

- [ ] 시크릿(`.env`, API 키) 커밋 없음
- [ ] 커밋 메시지·PR 제목이 변경 내용을 설명함
- [ ] `main`에 직접 푸시하지 않음 (feature 브랜치 → PR)
- [ ] 리뷰어가 보기 쉽게 슬라이스를 작게 유지함 (1기능 ≈ 1PR 권장)
