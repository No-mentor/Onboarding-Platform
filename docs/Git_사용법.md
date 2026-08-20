# Onboarding-Platform — Git / GitHub 사용법

| 항목 | 내용 |
|------|------|
| 기준 문서 | `docs/Git_사용법.pdf` (팀 원본) |
| 저장소 | https://github.com/No-mentor/Onboarding-Platform |
| 적용일 | 2026-07-31 |
| 기본 브랜치 (GitHub) | **`dev`** (개발 디폴트) |
| 배포 브랜치 | **`main`** (완전 배포·서비용) |

본 문서는 팀 **깃사용법** PDF를 이 저장소에 맞게 정리한 작업 가이드입니다.  
제품 원칙은 `AI_LEARN_FIRST.pdf`를, 브랜치·커밋·PR 규칙은 **본 문서**를 따릅니다.

---

## 1. 브랜치 전략

```text
main  ←  【배포·서비용】 검증 완료본만. 일상 개발 PR의 base가 아님
 │         (dev → main 은 릴리스/배포 준비 완료 시에만)
 │
 dev  ←  【개발 디폴트】 GitHub default branch. 기능 PR은 전부 여기로
 │
 feat/#12 , fix/#14 , docs/#3 , chore/#1  …  이슈 단위 개발 브랜치
```

| 브랜치 | 역할 | 직접 푸시 | PR base |
|--------|------|-----------|---------|
| **dev** | **일상 개발 통합.** 클론 후 기본 작업 브랜치 | 지양 (기능 브랜치 권장) | 기능 브랜치 → **dev** |
| **main** | **완전 배포·서비용.** 프로덕션/데모 안정본 | **금지** (보호 규칙) | **dev → main** (릴리스만) |
| **개발 브랜치** | 이슈 단위 작업 | push OK | → **dev** |

### 1.0 한 줄 규칙

- 평소: `dev` 기준으로 분기 → 작업 → PR → **dev**  
- 배포: 통합 테스트·검수 끝난 뒤 **dev → main** PR (배포 준비 완료본만)  
- `main`에 기능 PR을 직접 올리지 않는다.

### 1.1 개발 브랜치 네이밍

**작업 유형 태그 + `/#` + 이슈 번호**

| 예시 | 의미 |
|------|------|
| `feat/#12` | 이슈 #12 기능 개발 |
| `fix/#14` | 이슈 #14 버그/수정 |
| `docs/#3` | 이슈 #3 문서 |
| `chore/#1` | 이슈 #1 설정·잡무 |

### 1.2 개발 브랜치 생성 순서 (필수)

```bash
# 1) 이슈 시작 전 — 항상 dev 기준
git checkout dev
git pull origin dev

# 2) 이슈 번호에 맞는 브랜치 생성
git checkout -b feat/#12

# 3) 작업 단위마다 commit 후 push
git add .
git commit -m "feat: 로그인 기능 추가"
git push -u origin feat/#12
```

---

## 2. 커밋 컨벤션

형식: **`태그: 설명`** (한글/영문 모두 가능, 태그 소문자)

| 태그 | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat: 로그인 기능 추가` |
| `fix` | 버그 수정 | `fix: 로그인 예외 처리 버그 수정` |
| `docs` | README 등 문서 수정 | `docs: API 명세 업데이트` |
| `style` | 코드 스타일 변경 (동작 동일) | `style: 코드 포맷팅 개선` |
| `refactor` | 기능 변경 없이 구조 개선 | `refactor: 로그인 처리 로직 리팩토링` |
| `test` | 테스트 작성·수정 | `test: 사용자 인증 로직 테스트 추가` |
| `chore` | 패키지·설정·잡무 | `chore: 의존성 버전 업데이트` |
| `comment` | 주석 추가/수정 | `comment: 불필요한 주석 제거` |
| `hotfix` | 배포본 긴급 수정 | `hotfix: 서버 Timezone 설정 변경` |
| `rename` | 파일·클래스 이름 변경 | `rename: UserController → AuthController` |
| `remove` | 파일·클래스 삭제 | `remove: 사용하지 않는 DTO 제거` |
| `cicd` | CI/CD 설정 | `cicd: Github Actions workflow 추가` |

개발 중 여러 성격의 수정이 섞이면 **커밋 메시지 태그**로 구분하고, Issue Type은 대표 작업(예: Feature)으로 둔다.

---

## 3. Issue 컨벤션

### 3.1 제목

`[태그] 한눈에 보이는 작업 내용`

```text
[feat] 로그인 페이지 추가
[fix] 문서 권한 거부 시 내용 노출
[chore] Git 브랜치 전략 초기 세팅
[docs] ERD FK 설명 보강
```

### 3.2 본문 템플릿

```markdown
# [태그] 제목

---

## 목적
- 이 Issue를 만든 이유

## 상세 내용
- 구현·수정할 구체 항목

## 추가 사항(선택)
- 관련 Issue, 참고 문서, 스크린샷 등
```

### 3.3 생성 시 필수

- **Assignee:** 자기 자신
- **Label:** 작업 유형에 맞게 설정
- GitHub **Type** 도 라벨과 맞출 것  
  - 기능 개발 중 fix/refactor 커밋이 있어도 Type은 Feature 유지 가능 (수정은 커밋 메시지로 구분)

저장소 Issue 폼: Bug / Feature / Docs (`.github/ISSUE_TEMPLATE/`)

---

## 4. Pull Request 컨벤션

### 4.1 방향

| From | To | 시기 | Merge 방식 |
|------|-----|------|------------|
| `feat/#N` 등 | **dev** | 기능 단위 완료 시 (일상) | **Squash and Merge** |
| **dev** | **main** | **배포·서버 반영 준비 완료** 시에만 | 팀 합의 + main 보호 규칙 (리뷰·CI) |

> GitHub 저장소 **default branch = `dev`**.  
> 새 PR 생성 시 base가 `dev`로 잡히는지 확인하고, `main`으로 잘못 잡지 마세요.

### 4.2 제목

Issue 제목과 **동일**하게 작성.

```text
[feat] 로그인 페이지 추가
```

### 4.3 본문 템플릿

```markdown
# [태그] 제목

---

## Issue
- #12

## 변경 내용
- 이번 PR에서 바뀐 점을 짧게

## 구현 사항
- 구현·수정 경위 상세

## 참고 사항
- 리뷰 시 볼 포인트, 팀 공유 사항
```

### 4.4 PR 등록 체크

- [ ] **Reviewers:** 팀원 전원
- [ ] **Assignees:** 자기 자신
- [ ] **Label:** Issue와 동일
- [ ] **Development / Linked issue:** 관련 Issue 연결
- [ ] OnboardOS 제품 체크리스트 (권한·Citation·workspace 등) — PR 템플릿 참고

### 4.5 리뷰 · 병합 규칙

1. 모든 팀원을 리뷰어로 지정한다.
2. **팀원 절반 이상 승인** 후 병합한다.
3. 수정 요청이 있으면 반영 커밋 후 **재승인**을 받고 병합한다.
4. 개발 브랜치 → **dev** 는 **Squash and Merge**.
5. merge 버튼이 빨간색/에러면 **혼자 강제 병합하지 말고** 팀에 공유한다.

> 참고: GitHub `main` 브랜치 보호(리뷰 1+, CI, conversation resolve)가 켜져 있다.  
> 일상 개발 PR의 base는 **`dev`** 로 둔다.

---

## 5. 일상 워크플로 요약

```bash
# ----- 작업 시작 -----
git checkout dev
git pull origin dev
git checkout -b feat/#12

# ----- 작업 중 (작은 단위 커밋) -----
git add .
git commit -m "feat: 로그인 API 연동"
git push -u origin feat/#12

# ----- 완료 후 -----
# GitHub에서 PR: feat/#12 → dev
# Squash and Merge 후 로컬 정리
git checkout dev
git pull origin dev
git branch -d feat/#12
```

### 신규 클론

```bash
git clone https://github.com/No-mentor/Onboarding-Platform.git
cd Onboarding-Platform
git checkout dev
git pull origin dev
```

### 최초 1회 (PC별)

```bash
git config --global user.name "GitHub 닉네임"
git config --global user.email "GitHub 이메일"
```

---

## 6. 충돌 발생 시

```bash
git add .
git commit -m "chore: 충돌 해결 준비"
git pull origin dev   # 또는 작업 중인 base
# 충돌 파일 확인 → 충돌 마커 제거 후
git add .
git commit -m "fix: git 충돌 해결"
git push
```

문제 재현 시 `git status` 출력을 팀에 공유한다.

---

## 7. OnboardOS와 함께 볼 문서

| 문서 | 용도 |
|------|------|
| `AI_LEARN_FIRST.pdf` | 제품 원칙·MVP·바이브코딩 순서 |
| `docs/OnboardOS_*` | PRD · 기능 · API · ERD |
| `docs/Git_사용법.pdf` | 팀 원본 깃 사용법 |
| 본 문서 | 이 레포에서 바로 쓰는 요약 |

---

## 8. 초기 세팅 이력

| 항목 | 내용 |
|------|------|
| Issue | #1 `[chore] Git 브랜치 전략(dev) 및 사용법 초기 세팅` |
| Branch | `chore/#1` |
| 결과 | `dev` 브랜치 생성, 본 가이드·원본 PDF 반영 |
