# BE — Backend (OnboardOS)

프론트엔드(`FE/`)는 건드리지 않습니다. API·도메인·보안·AI는 **이 폴더에서만** 작업합니다.

## 스택

- Spring Boot 4 · Java 17
- Spring Security + JWT
- Spring Data JPA · Flyway · PostgreSQL
- springdoc-openapi (Swagger UI)

## 현재 구현 (MVP 백엔드 슬라이스)

| 영역 | 내용 |
|------|------|
| Auth | signup / login / me / logout + JWT |
| Workspace | 생성(OWNER) · 목록 · 수정 |
| Members | 초대 · 수락(NEW_HIRE 시 계획 생성) · 목록 · 역할 변경 |
| Documents | 업로드 · 청킹 · READY 상태 · 재처리 · soft delete |
| Onboarding | 30일 계획 생성 · 오늘 할 일 · 체크리스트 |
| Chat | RAG 키워드 검색 + Permission + Citation + Audit |
| Admin | audit-logs 조회 |
| DB | Flyway V1~V5 |

## 로컬 실행

```bash
# 1) DB
cd BE
cp .env.example .env   # 비밀번호 맞추기
docker compose up -d

# 2) 앱
./gradlew bootRun
```

- Health: http://localhost:8080/api/v1/health  
- Swagger: http://localhost:8080/swagger-ui.html  

### 스모크 예시

```bash
# 회원가입
curl -s -X POST http://localhost:8080/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"password1","name":"관리자"}'

# 로그인 후 토큰으로 Workspace 생성
TOKEN=...
curl -s -X POST http://localhost:8080/api/v1/workspaces \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Acme","slug":"acme"}'
```

## 패키지 구조

```text
com.onboardos.onboarding
├── auth/                 # 인증 API
├── workspace/            # Workspace API
├── domain/               # JPA 엔티티·리포지토리
│   ├── user/
│   ├── workspace/
│   └── common/
└── global/
    ├── config/
    ├── security/         # JWT, SecurityFilterChain
    ├── exception/
    └── web/
```

## 다음 슬라이스 (예정)

1. Members / Invitations  
2. Documents + ingest job  
3. Onboarding Plan / Recommendations  
4. Chat + Permission + Citation + Audit  

명세: 루트 `docs/OnboardOS_API_명세서.pdf`, `docs/OnboardOS_ERD.md`
