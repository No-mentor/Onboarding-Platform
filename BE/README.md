# BE — Backend (OnboardOS)

프론트엔드(`FE/`)는 건드리지 않습니다. API·도메인·보안·AI는 **이 폴더에서만** 작업합니다.

## 스택

- Spring Boot 4 · Java 17
- Spring Security + JWT
- Spring Data JPA · Flyway · PostgreSQL + **pgvector**
- LangChain4j + OpenAI (선택)
- springdoc-openapi · Testcontainers

## 현재 구현

| 영역 | 내용 |
|------|------|
| Auth / Workspace | JWT, OWNER 생성 |
| Members | 초대·수락·목록·역할 |
| Documents | 업로드·청킹·READY·(옵션) 임베딩 |
| Onboarding | 30일 계획·오늘 할 일·체크리스트 |
| Templates | CRUD + 계획 생성 시 템플릿 적용 |
| Chat | 벡터/키워드 RAG + Permission + Citation + Audit |
| Dashboard / Progress | 신입·관리자 집계 |
| AI | `AI_ENABLED` + `OPENAI_API_KEY` 시 임베딩·LLM |
| DB | Flyway V1~V7 |
| Test | Testcontainers 통합 테스트 |

## 로컬 실행

```bash
cd BE
cp .env.example .env
docker compose up -d          # pgvector/pgvector:pg17
./gradlew bootRun
```

- Health: http://localhost:8080/api/v1/health  
- Swagger: http://localhost:8080/swagger-ui.html  

### AI (선택)

```bash
# .env
AI_ENABLED=true
OPENAI_API_KEY=sk-...
```

미설정 시 키워드 RAG + 템플릿 답변.

### 테스트

```bash
./gradlew test   # Docker 필요
```

명세: 루트 `docs/OnboardOS_API_명세서.pdf`, `docs/OnboardOS_ERD.md`
