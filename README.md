# OnboardOS

**AI Organizational Operating System** — 신입의 Time To Productivity(TTP)를 줄이는 Proactive AI 플랫폼.

> 챗봇 / 문서검색 / LMS가 아닙니다.

## AI / 바이브코딩 시작

디렉토리를 CLI·IDE로 연 뒤 **코드를 쓰기 전에** 아래를 먼저 학습하세요.

| 순서 | 문서 | 설명 |
|------|------|------|
| **0** | [`AI_LEARN_FIRST.pdf`](./AI_LEARN_FIRST.pdf) | **필수** — 원칙, 구조, MVP, 워크플로, DoD |
| 1 | [`docs/OnboardOS_상세_PRD.pdf`](./docs/OnboardOS_상세_PRD.pdf) | 제품 요구사항 |
| 2 | [`docs/OnboardOS_기능명세서.pdf`](./docs/OnboardOS_기능명세서.pdf) | F-xx 수용 기준 |
| 3 | [`docs/OnboardOS_API_명세서.pdf`](./docs/OnboardOS_API_명세서.pdf) | REST API 스펙 |
| 4 | [`docs/OnboardOS_ERD.md`](./docs/OnboardOS_ERD.md) · [`docs/OnboardOS_ERD.pdf`](./docs/OnboardOS_ERD.pdf) | ERD · 관계 · 제약 · 인덱스 · DDL |

문서 재생성:

```bash
.venv/bin/python scripts/generate_docs.py
```

## 스택 (목표)

- **FE:** Next.js · React · TypeScript · Tailwind · shadcn/ui  
- **BE:** Spring Boot · Java · Spring Security · JWT  
- **AI:** LangChain4j · OpenAI (기본)  
- **DB:** PostgreSQL + pgvector  
- **Infra:** Docker Compose · Nginx · GitHub Actions  

## 게이트 질문

> 이 기능이 신입의 적응 속도(TTP)를 실제로 높이는가?

아니면 구현하지 않습니다.
