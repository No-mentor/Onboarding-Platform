# FE — Frontend

OnboardOS **프론트엔드 전용** 작업 공간입니다.  
UI·클라이언트 로직은 **이 폴더(`FE/`) 안에서만** 작성·수정합니다.

## 스택 (목표)

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS + shadcn/ui

## 디렉토리 (예정)

```text
FE/
├── README.md
├── public/                 # 정적 자산
├── src/
│   ├── app/                # App Router 페이지·레이아웃
│   ├── components/         # 공용·도메인 UI
│   ├── lib/                # api client, utils
│   └── types/              # 공유 타입 (클라이언트)
├── package.json            # (스캐폴딩 후)
└── …
```

현재는 구조 자리만 잡아 둔 상태입니다. 앱 생성은 별도 Issue에서 진행합니다.

## 규칙

- **Backend 코드·시크릿·LLM API 키를 여기에 두지 않습니다.** API는 `BE` 엔드포인트만 호출합니다.
- 브랜치/커밋은 팀 `docs/Git_사용법.md` 를 따릅니다. (`feat/#이슈` → PR → `dev`)
- 제품 원칙: 루트 `AI_LEARN_FIRST.pdf` (대시보드·오늘 할 일·Citation UI 등)

## 로컬 실행 (스캐폴딩 후)

```bash
cd FE
npm install
npm run dev
```
