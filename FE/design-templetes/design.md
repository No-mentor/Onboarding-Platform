---
id: "onboardos"
name: "OnboardOS"
country: KR
category: enterprise-ai-saas
homepage: null
primary_color: "#4E4E52"
logo:
  type: icon
  slug: "lucide:box"
verified: "2026-08-15"
omd: "0.1"
ds:
  name: OnboardOS Design System (internal)
  url: "docs/design.md"
  type: system
  description: 사내 전용 디자인 시스템. 공개 배포된 토큰 저장소는 없으며, 확정된 화면 시안 7종과 인증 화면 시안에서 역추출한 값을 SSOT로 삼는다. 구현 스택은 Next.js + Tailwind + shadcn/ui이며, CSS 변수를 단일 진입점으로 사용한다.
tokens:
  source: screen-derived
  extracted: "2026-08-15"
  colors:
    primary: "#4e4e52"
    primary-alt: "#363639"
    destructive: "#b4342f"
    warning: "#8a6a16"
    text: "#17171a"
    body: "#6b6b72"
    muted: "#9a9aa1"
    canvas: "#ffffff"
    panel: "#fafafa"
    surface: "#ffffff"
    sunk: "#f4f4f5"
    border: "#e7e7e9"
    border-strong: "#d6d6d9"
  typography:
    family: { sans: "Pretendard Variable", fallback: "-apple-system, Apple SD Gothic Neo, Malgun Gothic", numeric: "tabular-nums" }
    display:       { size: 32,   weight: 800, tracking: -0.045, use: "진행률 대형 수치 (32%)" }
    page-title:    { size: 30,   weight: 700, tracking: -0.035, use: "페이지 인사말 / 최상위 제목" }
    section-title: { size: 22,   weight: 700, tracking: -0.03,  use: "섹션 제목 (30일 인수인계 계획)" }
    card-title:    { size: 17,   weight: 600, tracking: -0.02,  use: "카드 헤더 (오늘 할 일 (3))" }
    body:          { size: 14,   weight: 400, tracking: -0.01,  use: "본문 · 목록 항목 · 입력값" }
    body-strong:   { size: 14,   weight: 600, use: "파일명 · 강조 항목" }
    label:         { size: 12.5, weight: 600, use: "폼 라벨 · 표 헤더 · 통계 라벨" }
    caption:       { size: 12,   weight: 400, use: "메타데이터 · 타임스탬프 · AI 고지" }
    badge:         { size: 11,   weight: 600, tracking: 0.04, transform: uppercase, use: "READY / PROCESSING" }
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 40, section: 56 }
  rounded: { xs: 5, sm: 7, md: 10, lg: 14, full: 9999 }
  shadow:
    none: "none"
    card: "0 1px 2px rgba(20,20,25,.04), 0 8px 24px rgba(20,20,25,.05)"
    modal: "0 24px 64px rgba(20,20,25,.14)"
    sticky: "0 -1px 0 #e7e7e9, 0 -12px 24px rgba(20,20,25,.04)"
  components:
    sidebar:          { type: card, bg: "#fafafa", fg: "#17171a", border-right: "1px #e7e7e9", w: 276, use: "좌측 고정 내비게이션 패널" }
    nav-item-active:  { type: button, bg: "#f4f4f5", fg: "#17171a", radius: 10, h: 42, font: "14px/600", use: "활성 내비 항목 — 배경 채움만, 좌측 액센트 바 없음" }
    button-primary:   { type: button, bg: "#4e4e52", fg: "#ffffff", radius: 10, h: 46, font: "14.5px/600", use: "화면당 1개만 허용되는 주 액션" }
    button-secondary: { type: button, bg: "#ffffff", fg: "#17171a", border: "1px #d6d6d9", radius: 10, h: 40, use: "카드 헤더 보조 액션 · 워크스페이스 셀렉터" }
    button-chip:      { type: button, bg: "#ffffff", fg: "#17171a", border: "1px #d6d6d9", radius: 7, h: 30, font: "12.5px", use: "행 단위 인라인 액션 (읽기 / 확인 / 검토)" }
    button-sticky:    { type: button, bg: "#4e4e52", fg: "#ffffff", radius: 10, h: 52, w: "100%", use: "하단 고정 일괄 액션 바" }
    badge-ready:      { type: badge, bg: "#f4f4f5", fg: "#6b6b72", radius: 7, h: 24, font: "11px/600", use: "문서 처리 상태 — 무채색 기본" }
    badge-failed:     { type: badge, bg: "rgba(180,52,47,.07)", fg: "#b4342f", radius: 7, h: 24, use: "유일하게 색을 쓰는 상태" }
    input:            { type: input, bg: "#ffffff", border: "1px #d6d6d9", radius: 10, h: 44, font: "14px", focus: "border #4e4e52 + ring 3px rgba(78,78,82,.11)" }
    card:             { type: card, bg: "#ffffff", border: "1px #e7e7e9", radius: 14, pad: 24, shadow: none, use: "모든 콘텐츠 블록의 기본 그릇" }
    dropzone:         { type: card, bg: "#ffffff", border: "2px dashed #d6d6d9", radius: 14, pad: "56 24", use: "파일 업로드 — drag-over 시 보더 #4e4e52 + bg #f4f4f5" }
    citation-chip:    { type: badge, bg: "#ffffff", border: "1px #d6d6d9", radius: 999, h: 30, font: "12.5px", use: "AI 응답 근거 — 조건부 렌더 금지" }
    progress:         { type: bar, track: "#f4f4f5", fill: "#4e4e52", h: 7, radius: 999, use: "진행률 — 최초 1회만 애니메이션" }
    page:             { type: card, bg: "#ffffff", fg: "#17171a", use: "흰 캔버스. 회색은 뒤로 물러난 패널에만 쓴다" }
  components_harvested: true
---

## 1. Visual Theme & Atmosphere — 비주얼 테마와 분위기

OnboardOS는 신입·인수인계 담당자가 매일 아침 여는 업무 운영 화면이다. 표면은 **완전한 무채색**이다. 브랜드 컬러 자리에 놓인 값조차 채도 0에 가까운 회색 `#4E4E52`이고, 팔레트 전체가 `#FFFFFF`에서 `#17171A`까지의 단일 축 위에 있다. 이것은 색을 못 정한 결과가 아니라 선택이다. 이 제품의 화면에는 READY / PROCESSING / PENDING / 진행률 32% / 3-of-6 완료 같은 **상태 신호가 항상 여러 개 동시에 떠 있고**, 배경에 색이 하나라도 들어가는 순간 그 신호들이 서로 경쟁하기 시작한다. 색을 전부 비워둔 덕에, 굵기·크기·여백만으로 위계가 읽힌다.

분위기는 조용하고 사무적이다. 흰 캔버스 위에 1px `#E7E7E9` 보더로 카드를 나누고, 그림자는 거의 쓰지 않으며, 카드 안쪽 구분은 실선이 아니라 점선(dashed)으로 한 단계 더 낮춘다. 정보 밀도는 높은데(파일 6개 표, 30일 타임라인, 4단 통계) 시각적 소음은 없다 — 이 문서가 지키려는 균형이 정확히 그 지점이다. 유일하게 큰 목소리를 내는 요소는 진행률의 `32%` 한 덩어리(32px/800)와 화면 하단을 가로지르는 진회색 액션 바 하나뿐이고, 그 둘이 각 화면의 "지금 어디까지 왔고, 다음에 뭘 누르면 되는가"를 대신 말한다.

## 2. Color Palette & Roles — 색 팔레트와 역할

팔레트는 아주 미세하게 따뜻한 뉴트럴 한 축이다. 값 사이 간격을 넓게 잡지 않고 **인접 단계의 차이를 얇게** 유지해서, 카드가 캔버스 위에 겹쳐도 화면이 조각나 보이지 않게 했다.

**Neutral scale**
- `#FFFFFF` — canvas / surface (메인 콘텐츠 · 카드 · 입력)
- `#FAFAFA` — panel (사이드바 · 인증 좌측 패널)
- `#F7F7F8` — surface-hover (행/버튼 hover)
- `#F4F4F5` — sunk (뱃지 배경 · 프로그레스 트랙 · 세그먼트 탭 그룹)
- `#E7E7E9` — border (카드 경계 · 구분선)
- `#D6D6D9` — border-strong (입력 · 아웃라인 버튼 · dashed 드롭존)
- `#9A9AA1` — muted (메타데이터 · placeholder · 완료된 항목)
- `#6B6B72` — body (보조 설명 · 라벨 · 비활성 내비)
- `#4E4E52` — **PRIMARY** (주 버튼 · 프로그레스 채움 · 체크 상태)
- `#363639` — primary hover
- `#17171A` — text (제목 · 본문 · 활성 내비)

**Semantic (예외적으로만)**
- Destructive: `#B4342F` — FAILED 상태 · 입력 에러 · 삭제
- Warning: `#8A6A16` — 지연(overdue) 항목 · 만료 임박 초대

역할 규칙: `#4E4E52`는 **눌러야 하는 곳**에만 간다. 배경으로 넓게 깔지 않고, 화면당 채움 버튼은 하나다. 회색 스케일이 구조·텍스트·상태를 전부 처리한다. 색은 두 가지 상황에서만 등장하며, 그 등장 자체가 "여기서 뭔가 잘못됐다"는 신호가 된다.

가장 중요한 금지 규칙: **성공에 초록을 쓰지 않는다.** 완료는 `#4E4E52` 채움 체크박스 + 라벨 취소선 + `#9A9AA1` 텍스트로 표현한다. 초록을 한 번 들이면 READY 뱃지·완료 체크·진행률 채움이 전부 색을 요구하기 시작하고, 무채색 상태 체계가 그날로 무너진다.

## 3. Typography Rules — 타이포그래피 규칙

국문·영문 모두 **Pretendard Variable** 단일 서체로 간다. 국문 UI에서 서체를 섞으면 라벨(12.5px)과 본문(14px) 사이의 위계가 흐려지는데, 이 화면들은 그 두 단계를 아주 자주 오간다. 폴백은 `-apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic'`.

자간은 크기가 커질수록 좁힌다 — 본문 `-0.01em`에서 대형 수치 `-0.045em`까지. 국문 볼드는 기본 자간으로 두면 헐거워 보이기 때문에, 제목이 커질수록 조여야 덩어리로 읽힌다.

- Display `32px / 800 / -0.045em` — 진행률 수치
- Page Title `30px / 700 / -0.035em` — "안녕하세요, 김세원님"
- Section Title `22px / 700 / -0.03em`
- Card Title `17px / 600 / -0.02em`
- Body `14px / 400`, Body Strong `14px / 600`
- Label `12.5px / 600`
- Caption `12px / 400`
- Badge `11px / 600 / +0.04em / uppercase`

행간은 제목 `1.35`, 본문 `1.6`, 긴 설명문 `1.72`. 진행률·표 수치·집행률 등 숫자가 세로로 정렬되는 곳은 `font-variant-numeric: tabular-nums`를 강제한다 — 예산표에서 자릿수가 흔들리면 표 전체의 신뢰가 깎인다.

## 4. Component Stylings — 컴포넌트 스타일

### Sidebar (좌측 내비게이션)

**Default**
- Background: `#FAFAFA` / Border-right: `1px #E7E7E9` / Width: `276px`
- 구성: 로고(큐브 아이콘 26px + 텍스트 19px/700) → 주 내비 7개 → dashed divider → 관리 내비 3개 → 하단 사용자 카드
- Use: 모든 인증 후 화면에 고정. `lg` 미만에서는 오프캔버스로 전환

### Nav item

**Active** — Background `#F4F4F5`, Text `#17171A`, Weight `600`, Radius `10px`, Height `42px`
**Default** — Background none, Text `#6B6B72`, Weight `500`
**Hover** — Background `#F7F7F8`
- 좌측 세로 액센트 바를 **쓰지 않는다.** 배경 채움만으로 활성을 표현한다.

### Primary button

**Default**
- Background: `#4E4E52` / Text: `#FFFFFF` / Border: none
- Radius: `10px` / Height: `46px`(폼) · `40px`(인라인) / Font: `14.5px / 600`
- Hover: `#363639` / Active: `translateY(1px)` (스케일 변화 없음)
- Use: 화면당 1개. "로그인" · "계정 만들기" · "모두 완료 처리"

### Secondary button

**Default**
- Background: `#FFFFFF` / Text: `#17171A` / Border: `1px #D6D6D9` / Radius: `10px` / Height: `40px`
- Use: 카드 헤더 보조 액션("내 할 일 전체 보기"), 워크스페이스 셀렉터, Google 로그인

### Chip action

**Default**
- Border: `1px #D6D6D9` / Radius: `7px` / Height: `30px` / Font: `12.5px`
- Use: 목록 행 우측의 즉시 실행 액션 — "읽기" · "확인" · "검토"

### Status badge

**READY / PROCESSING** — Background `#F4F4F5`, Text `#6B6B72`
**PENDING** — Background transparent, Border `1px #E7E7E9`, Text `#9A9AA1`
**FAILED** — Background `rgba(180,52,47,.07)`, Text `#B4342F`
- 공통: Height `24px`, 좌우 패딩 `9px`, Radius `7px`, `11px/600`, uppercase, 자간 `+0.04em`
- PROCESSING만 좌측 `2px` 점에 pulse 애니메이션을 허용한다.

### Card

**Default**
- Background: `#FFFFFF` / Border: `1px #E7E7E9` / Radius: `14px` / Padding: `24px` / Shadow: `none`
- 내부 구분은 `1px dashed #E7E7E9`. 실선은 카드 경계에만 쓴다.
- Use: 대시보드 요약, 파일 카드, 폼 블록 등 모든 콘텐츠 그릇

### Input

**Default** — Background `#FFFFFF`, Border `1px #D6D6D9`, Radius `10px`, Height `44px`, Font `14px`
**Hover** — Border `#C3C3C8`
**Focus** — Border `#4E4E52` + `box-shadow: 0 0 0 3px rgba(78,78,82,.11)`
**Error** — Border `#B4342F`, 하단 12px 에러 문구 노출, hint 숨김
- 비밀번호 필드는 우측에 `34px` 표시 토글 버튼을 내장한다 (우패딩 `44px`).

### Upload dropzone

**Default** — Border `2px dashed #D6D6D9`, Radius `14px`, Padding `56px 24px`, 중앙 정렬
**Drag-over** — Border `#4E4E52`, Background `#F4F4F5`
- 구성: 클라우드 아이콘 `40px` → 안내문 `15px/600` → Primary 버튼 → 지원 포맷·최대 용량 `12px #9A9AA1`

### Citation chip

**Default**
- Background `#FFFFFF`, Border `1px #D6D6D9`, Radius `999px`, Height `30px`, Font `12.5px`
- 내용: 파일 타입 아이콘 + `파일명 (p.2)`
- Use: AI 응답 카드 하단. **조건부 렌더 금지** — 근거가 없으면 안내 칩을 대신 렌더한다.

### Progress bar

**Default** — Track `#F4F4F5`, Fill `#4E4E52`, Height `7px`(대형 `10px`), Radius `999px`
- 대형 수치는 트랙 위에 Display 스타일로 얹는다.
- 통계 행은 라벨(위, `12.5px #6B6B72`) / 값(아래, `20px/700`), 항목 사이 `1px dashed` 세로 구분선.

### Chat surface

**User bubble** — 우측 정렬, Background `#F4F4F5`, Radius `14px`(우하단 `7px`), 최대폭 `76%`
**AI response** — 좌측, 아바타 `32px` 라운드 정사각(큐브 아이콘) + 카드(`#FFFFFF` / `1px #E7E7E9`)
**Input bar** — Height `52px`, Border `1px #D6D6D9`, Radius `10px`, 우측 send 아이콘 버튼
- 입력 바 하단의 AI 고지 문구(`12px #9A9AA1`, 중앙 정렬)는 항상 노출한다.

### Sticky action bar

**Default** — 하단 고정, Width `100%`, Height `52px`, Background `#4E4E52`, Shadow `0 -1px 0 #E7E7E9, 0 -12px 24px rgba(20,20,25,.04)`
- Use: 목록 화면의 일괄 처리("모두 완료 처리"), 상세 화면의 AI 진입("AI에게 이 파일에 대해 물어보기")

### Icons

`lucide-react` 단일 라이브러리, `stroke-width: 1.7`, **아웃라인만**. 내비 `20px`, 인라인 `15~17px`, 상태 `40px`. 채움 아이콘과 이모지는 기능 아이콘으로 쓰지 않는다(인사말의 👋 하나만 예외).

## 5. Layout Principles — 레이아웃 원칙

전체 골격은 **고정 사이드바 + 흐르는 메인**의 2단이다. 사이드바 `276px`은 회색 패널로 한 단계 뒤로 물러나 있고, 메인은 흰 캔버스로 앞에 나온다. 인증 화면도 같은 논리를 그대로 쓴다 — 좌측 `460px` 회색 브랜드 패널 / 우측 흰 폼 영역. 로그인 직후 대시보드로 넘어가도 화면의 무게중심이 이동하지 않는다.

메인은 최대 `1280px` 중앙 정렬, 좌우 패딩 `40px`. 페이지 헤더는 좌측에 제목 + 한 줄 설명, 우측에 워크스페이스 셀렉터 · 알림 · 도움말을 놓는다. 이 헤더 구조는 모든 화면에서 동일하다.

본문은 화면의 성격에 따라 일곱 가지 패턴 중 하나를 따른다.

| 패턴 | 구조 | 적용 |
|------|------|------|
| Overview | 2컬럼 요약 카드 → 전폭 리스트 | 신입/관리자 대시보드 |
| List | 검색 → 필터 칩 → 표 → 페이지네이션 | 파일 탐색, 문서·멤버 관리 |
| Detail | 요약 헤더 → 언더라인 탭 → 2컬럼 본문 → sticky 액션 | 파일 상세 |
| Task | 진행 요약 → 카테고리 그룹 목록 → sticky 일괄 액션 | 오늘 할 일, 체크리스트 |
| Timeline | 헤더 + 주차 탭 → 세로 타임라인 | 30일 인수인계 계획 |
| Conversation | 헤더 → 스크롤 메시지 → 고정 입력 | AI Chat |
| Auth | 좌 브랜드 패널 / 우 폼(`396px`) | 로그인 · 회원가입 |

카드 사이 `20px`, 섹션 사이 `32px`, 라벨↔입력 `7px`, 필드↔필드 `16px`. 액션은 흩뿌리지 않고 두 지점에 모은다 — 카드 헤더 우측(보조)과 화면 하단(주).

## 6. Depth & Elevation — 깊이와 레이어

깊이는 그림자가 아니라 **보더와 명도 단차**로 만든다. 회색 패널(`#FAFAFA`)이 한 단계 뒤, 흰 캔버스(`#FFFFFF`)가 앞, 그 위의 카드는 `1px #E7E7E9` 보더만으로 분리된다. 목록 안에 늘어선 카드에는 그림자를 넣지 않는다 — 10개가 나란히 놓이면 그림자가 겹쳐 화면이 탁해진다.

그림자는 실제로 떠 있는 것에만 붙는다. 강조 카드와 팝오버는 `0 1px 2px rgba(20,20,25,.04), 0 8px 24px rgba(20,20,25,.05)`, 모달·드롭다운은 `0 24px 64px rgba(20,20,25,.14)`, 하단 고정 바는 위쪽으로만 퍼지는 `0 -12px 24px rgba(20,20,25,.04)`.

같은 원리가 안쪽으로도 적용된다. `#F4F4F5`(sunk)는 눌린 면 — 뱃지 배경, 프로그레스 트랙, 세그먼트 탭 컨테이너처럼 "표면보다 낮은 것"에만 쓰고, 그 위에 흰 요소가 올라와 활성 상태를 표현한다. 세그먼트 탭의 활성 탭이 흰색인 이유가 이것이다.

## 7. Do's and Don'ts

### Do
- `#4E4E52`는 눌러야 하는 곳에만 쓴다 — 주 버튼, 프로그레스 채움, 체크 상태.
- 구조와 텍스트는 전부 회색 스케일이 처리한다: 패널 `#FAFAFA`, 캔버스 `#FFFFFF`, 텍스트 `#17171A`.
- 완료는 체크 + 취소선 + `#9A9AA1`으로 표현한다.
- 카드는 보더로 분리하고, 카드 안쪽 구분은 dashed로 한 단계 낮춘다.
- 아이콘은 lucide 아웃라인 `stroke-width: 1.7`로 통일한다.
- 빈 화면에는 항상 다음 행동 버튼을 놓는다.
- 숫자가 세로로 정렬되는 표에는 `tabular-nums`를 건다.

### Don't
- **성공에 초록, 진행에 파랑을 쓰지 않는다.** 상태는 무채색 체계 안에서만 표현한다.
- 화면당 채움 버튼을 2개 이상 두지 않는다.
- 그라디언트 배경·글래스모피즘·과한 그림자를 쓰지 않는다 — 깊이는 명도 단차로 낸다.
- 서체를 추가하지 않는다(Noto·Roboto 등 혼용 금지).
- 채움 아이콘과 이모지를 기능 아이콘으로 쓰지 않는다.
- 활성 내비에 좌측 세로 액센트 바를 붙이지 않는다.
- Citation 칩 영역을 조건부로 없애지 않는다.
- 시스템 용어를 화면에 노출하지 않는다(`workspace_id`, `embedding`, `chunk`).

## 8. Responsive Behavior — 반응형 동작

Desktop first로 설계하되 `375px`까지 깨지지 않는 것을 하한선으로 잡는다.

| 브레이크포인트 | 동작 |
|----------------|------|
| `≥ 1280px` | 사이드바 `276px` 고정 + 메인 2컬럼 그리드 |
| `1024–1279px` | 사이드바 유지, 대시보드 요약 카드 2컬럼 → 1컬럼 |
| `900–1023px` | 사이드바를 오프캔버스 드로어로 전환, 헤더에 햄버거 노출 |
| `< 900px` | 인증 화면의 좌측 브랜드 패널을 상단 헤더로 압축(미니 카드·특징 목록 숨김) |
| `< 768px` | 메인 좌우 패딩 `40px → 20px`, 표는 카드 리스트로 재구성, sticky 액션 바는 safe-area 패딩 추가 |

패널(`#FAFAFA`)과 캔버스(`#FFFFFF`)의 명도 단차는 모든 폭에서 유지한다. 이 단차가 사라지면 모바일에서 레이어 구조가 통째로 평평해진다. 표를 카드로 접을 때도 상태 뱃지는 절대 생략하지 않는다 — 상태는 부가 정보가 아니라 본문이다.

## 9. Agent Prompt Guide — AI 코딩 도구 프롬프트

AI 코딩 도구로 이 제품의 UI를 생성할 때는 다음을 그대로 붙여 넣는다.

> "차분한 업무 운영 대시보드를 만든다. 팔레트는 완전한 무채색이다: 캔버스 `#FFFFFF`, 패널·사이드바 `#FAFAFA`, 눌린 면 `#F4F4F5`, 보더 `#E7E7E9`(입력·아웃라인은 `#D6D6D9`), 텍스트 `#17171A` / 보조 `#6B6B72` / 메타 `#9A9AA1`. 주 액션 색은 회색 `#4E4E52`이며 오직 주 버튼·프로그레스 채움·체크 상태에만 쓴다. 채도 있는 색은 FAILED와 에러(`#B4342F`), 지연(`#8A6A16`)에만 허용한다. **성공에 초록, 진행에 파랑을 절대 쓰지 마라** — 완료는 회색 체크 + 취소선 + `#9A9AA1`으로 표현한다. 서체는 Pretendard Variable 하나만 쓰고, 본문 14px, 제목이 커질수록 자간을 `-0.01em`에서 `-0.045em`까지 조인다. Radius는 입력·버튼 10px, 카드 14px, 뱃지 7px. 카드는 `1px #E7E7E9` 보더만 쓰고 그림자를 넣지 마라 — 깊이는 회색-흰색 명도 단차로 만든다. 아이콘은 lucide 아웃라인 `stroke-width: 1.7`로 통일하고 채움 아이콘과 이모지는 쓰지 마라. 화면당 채움 버튼은 1개, 나머지는 아웃라인이나 텍스트 버튼이다. 상태 뱃지(READY / PROCESSING / PENDING)는 항상 노출하고, AI 응답에는 근거 칩을 반드시 붙인다. UI 문구는 정중한 국문 존댓말, 버튼은 동사로 끝낸다."

## 10. Voice & Tone — 목소리와 어조

인터페이스의 목소리는 **먼저 준비해 두고 조용히 물러나는 동료**다. 설명하려 들지 않고, 팔지 않고, 사과하지 않는다.

- 정중한 국문 존댓말. 문장부호는 최소, 마침표는 완결된 문장에만.
- 버튼은 동사로 끝난다. "제출" ❌ → "로그인" · "계정 만들기" · "모두 완료 처리" ✅
- 액션 이름은 흐름 내내 동일하다. `계정 만들기` → 토스트 `계정을 만들었어요`
- 시스템 용어를 사용자에게 노출하지 않는다. `workspace_id` → "업무 공간", `embedding` → "AI 분석", `chunk` → "문서 조각"
- 에러는 사과하지 않고 무엇이 잘못됐고 어떻게 고치는지만 말한다. "죄송합니다. 오류가 발생했습니다" ❌ → "영문과 숫자를 포함해 8자 이상이어야 합니다" ✅
- 빈 화면은 사과문이 아니라 다음 행동 제안이다.
- 권한 거부 문구는 문서의 존재 여부를 드러내지 않는 고정 문장을 쓴다: "접근 권한이 있는 문서에서 확인된 근거가 없어 답변드릴 수 없습니다. 관리자에게 권한을 요청하세요."

**용어 고정**: 업무 공간(≠워크스페이스/테넌트) · 오늘 할 일(≠추천) · 인수인계 로드맵 / 30일 계획(≠온보딩 플랜) · 근거·출처(≠citation) · 파일·문서(≠도큐먼트)

## 11. Brand Narrative — 브랜드 서사

이름의 `-OS`가 이 제품의 전부다. OnboardOS는 챗봇이 아니라 조직 적응을 설계·운영·분석하는 **운영 플랫폼**을 표방하고, PRD의 성공 선언도 한 문장으로 못 박혀 있다 — "우리는 AI 챗봇을 만든 것이 아니라, 기업의 생산성을 높이는 AI 운영 플랫폼을 만들었습니다."

시각 언어는 그 선언을 그대로 옮긴 것이다. 챗봇 제품들이 흔히 취하는 대화 중심 레이아웃·보라 그라디언트·말풍선 우선 구성을 의도적으로 피하고, 대신 **대시보드·표·타임라인·상태 뱃지**를 앞세웠다. AI Chat은 사이드바 일곱 번째 항목이지 첫 화면이 아니다. 첫 화면은 오늘 할 일 3개와 진행률 32%다.

무채색 팔레트도 같은 서사에 속한다. 이 제품은 브랜드 컬러로 기억되려 하지 않고, 매일 아침 열었을 때 **어제와 똑같이 정확한 상태를 보여주는 것**으로 기억되려 한다. 로고가 큐브 아웃라인인 것도 그래서다 — 안에 무언가를 담는 구조물이지, 말을 거는 캐릭터가 아니다.

## 12. Principles — 원칙

- **Monochrome First** — 색은 장식이 아니라 신호다. 색을 쓰는 순간 그건 "중요하다"는 뜻이 된다.
- **Status is Content** — READY·진행률·완료 여부는 부가 정보가 아니라 화면의 본문이다. 어떤 폭에서도 생략하지 않는다.
- **Calm Density** — 정보량은 많되 소음은 없다. 여백·1px 보더·dashed 구분선으로 나누고 그림자와 채도는 아낀다.
- **Answer Before Question** — 사용자가 찾기 전에 놓여 있어야 한다. 오늘 할 일은 항상 최상단.
- **Evidence Visible** — AI 응답에는 반드시 출처 칩이 붙는다. 근거 없는 답변은 UI에도 존재할 수 없다.
- **One Primary per Screen** — 화면당 채움 버튼은 하나. 나머지는 아웃라인 또는 텍스트.
- **Depth by Value, Not Shadow** — 레이어는 명도 단차로 만든다.

## 13. Personas — 페르소나

- **신입 / 인수인계 담당자 (Primary)** — 무엇부터 해야 할지 모르고, 질문하는 것 자체가 부담이다. 시스템은 흰 캔버스 위에 오늘 할 일 3개, 진행률 32%, 그리고 하단의 단 하나의 진회색 버튼으로 답한다. 고민할 선택지를 늘리지 않는 것이 이 사람에 대한 배려다.
- **온보딩 담당자 / HR / 팀 리더 (Admin)** — 문서 업로드와 멤버 초대를 반복하며 여러 신입의 진행 상황을 훑는다. 표 중심 List 패턴, 상태 뱃지, 진행률 바가 이 사람의 화면이다. 한 행에서 상태를 즉시 읽을 수 있어야 하므로 뱃지는 무채색이되 형태가 분명해야 한다.
- **IT / 보안 담당자** — 데이터 유출 없는 AI 도입을 검증한다. 이 사람에게 UI가 증명해야 하는 것은 Citation 칩과 권한 거부 표준 문구다. 근거가 눈에 보이지 않으면 시스템은 신뢰를 얻지 못한다.

## 14. States — 상태

| 상태 | 표현 |
|------|------|
| Resting text | `#17171A` / 보조 `#6B6B72` / 메타 `#9A9AA1` |
| Resting surface | 캔버스 `#FFFFFF`, 패널 `#FAFAFA`, 눌린 면 `#F4F4F5` |
| Hover (행·버튼) | Background `#F7F7F8`, 보더는 `#D6D6D9` → `#C3C3C8` |
| Focus | Border `#4E4E52` + ring `0 0 0 3px rgba(78,78,82,.11)`. 키보드 포커스는 `2px solid #4E4E52`, offset `2px` |
| Active (누름) | `translateY(1px)`. 스케일 변화 없음 |
| Selected (내비·탭) | Background `#F4F4F5` 또는 흰 배경 + `0 1px 2px` (세그먼트 탭) |
| Checked | Background·Border `#4E4E52` + 흰 체크 |
| Completed | 체크 + 라벨 취소선 + `#9A9AA1` |
| Disabled | 텍스트 `#9A9AA1`, 보더 `#E7E7E9`, `cursor: not-allowed`, opacity 변경 없음 |
| Loading | 스켈레톤은 `#F4F4F5` 블록. 스피너는 인라인 `16px` 아웃라인만 |
| Error | Border `#B4342F`, 하단 12px 문구, hint 숨김 |
| Empty | 아이콘 `40px #9A9AA1` → 제목 `15px/600` → 설명 → Primary 버튼 |

Disabled에서 opacity를 낮추지 않는 이유는, 이 화면들이 이미 `#9A9AA1`을 완료·메타 표현에 쓰고 있어서 반투명까지 섞이면 상태 구분이 무너지기 때문이다.

## 15. Motion & Easing — 모션

모션은 **상태가 바뀌었다는 사실을 알리는 최소한**으로만 쓴다. 이 제품은 매일 여는 도구이고, 매번 재생되는 애니메이션은 3일이면 방해물이 된다.

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--ease` | `cubic-bezier(.22,.9,.3,1)` | 기본 이징 |
| `--dur-fast` | `140ms` | hover · 체크 토글 · 뱃지 |
| `--dur-base` | `180ms` | 탭 전환 · 드로어 · 패널 |
| `--dur-slow` | `1100ms` | 진행률 바 최초 채움 — 세션당 1회 |

진행률 바의 채움 애니메이션이 유일하게 긴 모션이고, 이것도 화면 진입 시 한 번만 재생한다. 값이 갱신될 때는 `--dur-base`로 짧게 움직인다. PROCESSING 뱃지의 점 pulse를 제외하면 무한 반복 애니메이션은 없다.

`prefers-reduced-motion: reduce`에서는 모든 transition·animation을 제거하고 최종 상태로 즉시 렌더한다. 프로그레스 바는 최종 폭으로 고정된다. **선택이 아니라 머지 조건이다.**

---
**Verified:** 2026-08-15
**Tier 1 sources:** 확정 화면 시안 7종(홈 대시보드 · 파일 업로드 · AI Chat · 오늘 할 일 · 파일 탐색 · 인수인계 로드맵 · 파일 상세), 인증 화면 시안 `onboardos-auth.html`(로그인·회원가입, 토큰 정의 포함), `OnboardOS 상세 PRD v1.0`(PR-01~PR-08 제품 원칙, 페르소나 P1~P3, 화면 목록 S-01~S-11), `OnboardOS 기능명세서 v1.0`(F-01~F-13 UI 요구사항, 권한 매트릭스), `OnboardOS API 명세서 v1.0`(상태 코드·에러 문구·응답 스키마), `OnboardOS_ERD.md`(status enum 값 — PENDING/PROCESSING/READY/FAILED)
**Tier 2 sources:** 없음 — 외부 공개 디자인 시스템·토큰 저장소 미보유(사내 전용 제품)
**Conflicts unresolved:** 기능명세서 §2.1은 역할을 `INTERN / NEW_HIRE`로 병기하나 ERD·API 명세서는 `NEW_HIRE` 단일. UI 라벨은 `NEW_HIRE` 기준으로 통일했다.
**Proof:** 토큰은 화면 시안에서 역추출한 값이며(`source: screen-derived`), 측정 근거가 없는 항목은 추정치다 — 사이드바 폭 `276px`, 표 행 높이 `64px`, 타임라인 노드 `10px`, 아바타 `32/36px`. 원본 디자인 파일이 확보되면 이 다섯 값을 우선 대조한다. `--accent: #4E4E52` 역시 스크린샷 추출값이므로, 원본과 다를 경우 이 한 줄 수정만으로 전체가 따라오도록 CSS 변수를 단일 진입점으로 설계했다.