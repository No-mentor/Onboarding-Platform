# FE — Frontend (OnboardOS)

백엔드(`BE/`)는 건드리지 않습니다. 화면·컴포넌트·스타일은 **이 폴더에서만** 작업합니다.

## 스택

- Next.js 16 (App Router) · React 19 · TypeScript 5
- 스타일: CSS Modules (`*.module.css`) + `app/globals.css` 의 디자인 토큰
- 아이콘: **lucide-react** (기본) · Font Awesome (파일 형식 아이콘)
- 차트: recharts
- 패키지 매니저: **npm** (`package-lock.json` 기준)

> 텍스트 이모지(✨, ✓ 등) 대신 아이콘 컴포넌트를 사용합니다.

## 현재 구현

목업 단계입니다. 아래 화면은 화면 안의 목 데이터로 렌더링되며 **BE 서버 없이 동작**합니다.

| 경로 | 화면 |
|------|------|
| `/` | 랜딩 페이지 |
| `/dashboard` | 대시보드 (홈) |
| `/file-management` | 파일 탐색 |
| `/ai-chat` | AI 질문 |
| `/daily-tasks` | 오늘 할 일 |
| `/30day-plan` | 30일 계획 |
| `/checklist` | 체크리스트 |
| `/members` | 구성원 및 초대 |
| `/onboarding-progress` | 신입 진행 현황 |
| `/templates` | 온보딩 템플릿 |
| `/audit-log` | 감사 로그 |
| `/dashboard/progress` | 진행 현황 상세 |

아래 화면은 **실제 API 를 호출**하므로 BE 서버가 떠 있어야 합니다.

| 경로 | 화면 | 필요 API |
|------|------|----------|
| `/login` | 로그인 · 회원가입 (탭 전환) | `POST /api/v1/auth/login`<br>`POST /api/v1/auth/signup` |
| `/verify-email` | 이메일 인증 | (아직 미연결 — 화면만 구현) |

> 회원가입은 별도 경로가 아니라 `/login` 안의 탭입니다.

## 로컬 실행

Node.js **20.9 이상**이 필요합니다 (Next.js 16 요구사항).

```bash
node -v                      # v20.9 이상 확인

cd FE
npm install
cp .env.example .env.local   # 최초 1회
npm run dev
```

http://localhost:3000 으로 접속합니다.

> 3000 번 포트가 사용 중이면 Next.js 가 자동으로 다음 포트(3001 등)로 띄웁니다.
> 터미널에 출력되는 `Local:` 주소를 확인하세요.

## 환경 변수

`.env.example` 에 있는 항목이 전부입니다.

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

BE 서버의 **호스트까지만** 적습니다. `/api/v1/...` 경로는 코드(`lib/auth.ts`)에서 붙이므로
뒤에 경로를 더 쓰면 요청 URL 이 어긋납니다.

BE 를 다른 포트로 띄운다면 이 값만 바꾸면 됩니다. 값을 지정하지 않으면
`http://localhost:8080` 으로 폴백하므로, **변수명 오타가 있어도 기본 포트에서는 정상 동작**합니다.
포트를 바꿨는데 반영되지 않으면 변수명부터 확인하세요.

`.env.local` 은 `.gitignore` 대상입니다. 커밋하지 않습니다.

## 빌드

```bash
npm run build   # 타입 체크 포함
npm run lint
```

## 폴더 구조

```
FE/
├── app/                    # App Router. 폴더명 = URL 경로
│   ├── globals.css         # 디자인 토큰 (CSS 변수)
│   └── <route>/
│       ├── page.tsx
│       └── <route>.module.css
├── components/
│   ├── ui/                 # 공통 UI — Modal, Toast 등
│   ├── common-sidebar.tsx  # 좌측 내비게이션 (전 화면 공용)
│   └── dashboard/          # 대시보드 전용 컴포넌트
└── lib/                    # API 호출, 유틸
```

### 모달

모달은 `components/ui/modal.tsx` 의 `<Modal>` 을 사용합니다. 화면마다 오버레이를
따로 만들지 않습니다. ESC 닫기, 배경 클릭 닫기, 포커스 순환, 배경 스크롤 잠금이
컴포넌트에 포함돼 있습니다.

```tsx
{isOpen && (
  <Modal
    open
    onClose={() => setIsOpen(false)}
    title="문서 삭제"
    size="sm"
    footer={
      <>
        <ModalSecondaryButton onClick={() => setIsOpen(false)}>취소</ModalSecondaryButton>
        <ModalDangerButton onClick={handleDelete}>삭제</ModalDangerButton>
      </>
    }
  >
    본문 내용
  </Modal>
)}
```

확인 버튼의 로딩·완료 알림은 `components/ui/use-modal-action.ts` 훅을 씁니다.
현재는 목업이라 짧은 지연 후 토스트를 띄우며, **API 연동 시 훅에 넘기는 콜백만
실제 호출로 바꾸면 됩니다.**

## 자주 겪는 문제

**화면이 예전 상태로 보이거나 `.next` 관련 에러가 날 때** — 빌드 캐시를 지웁니다.

```bash
rm -rf .next && npm run dev
```

**`next-env.d.ts` 가 수정된 것으로 잡힐 때** — Next.js 가 dev/build 모드에 따라
자동 생성하는 파일입니다. 커밋하지 말고 되돌립니다.

```bash
git checkout -- next-env.d.ts
```

## 참고

- 화면 명세: 루트 [`docs/OnboardOS_기능명세서.pdf`](../docs/OnboardOS_기능명세서.pdf)
- API 명세: 루트 [`docs/OnboardOS_API_명세서.pdf`](../docs/OnboardOS_API_명세서.pdf)
- 백엔드 실행: [`BE/README.md`](../BE/README.md)
