# [태그] 제목

<!-- 예: [feat] 로그인 기능 추가  — Issue 제목과 동일하게 작성 -->

---

## Issue

- 관련 이슈: #
<!-- ex) #12 -->

## 변경 내용

<!-- 이번 PR에서 무엇이 바뀌었는지 짧게 -->
-

## 구현 사항

<!-- 구현·수정 경위 상세 -->
-

## 참고 사항

<!-- 리뷰 포인트, 팀 공유 사항 -->
-

---

## OnboardOS 체크리스트

- [ ] TTP 게이트 통과 (적응 속도/생산성에 기여)
- [ ] Out of Scope 아님 (단순 RAG 챗봇 / LMS / 문서검색기 아님)
- [ ] `workspace_id` 격리 유지
- [ ] 문서·AI면 Permission Check / Citation / Audit 고려
- [ ] API·ERD 변경 시 `docs/` 명세 정합
- [ ] 시크릿(`.env`, API 키) 커밋 없음

## Test plan

- [ ] Happy path
- [ ] 권한 거부 / 타 Workspace (해당 시)

```text
1.
2.
3.
```

---

## PR 등록 확인 (팀 규칙)

- [ ] **Base branch = `dev`** (main 직접 PR 금지 · 일상 개발)
- [ ] Reviewers: 팀원 전원
- [ ] Assignees: 본인
- [ ] Label: Issue와 동일
- [ ] Development에 Issue 연결
- [ ] 병합: **Squash and Merge** (개발 브랜치 → dev)
- [ ] 팀원 **절반 이상 승인** 후 병합
