# BE — Backend

OnboardOS **백엔드 전용** 작업 공간입니다.  
API·도메인·AI(RAG)·보안 로직은 **이 폴더(`BE/`) 안에서만** 작성·수정합니다.

## 스택 (목표)

- Spring Boot + Java
- Spring Security + OAuth2 + JWT
- PostgreSQL + pgvector
- LangChain4j / OpenAI (서버 사이드만)

## 디렉토리 (예정)

```text
BE/
├── README.md
├── src/main/java/.../
│   ├── domain/
│   ├── repository/
│   ├── service/            # PermissionService 등
│   ├── web/                # REST controllers
│   ├── ai/                 # RAG, Planner, Recommendation
│   ├── security/
│   └── config/
├── src/main/resources/
│   ├── application.yml
│   └── db/migration/       # Flyway 등
├── build.gradle / pom.xml  # (스캐폴딩 후)
└── …
```

현재는 구조 자리만 잡아 둔 상태입니다. 프로젝트 생성은 별도 Issue에서 진행합니다.

## 규칙

- **Frontend 코드는 `FE/`에만** 둡니다. 이 폴더에 React/Next 코드를 넣지 않습니다.
- LLM·임베딩 키는 서버 환경변수로만 관리합니다. (`FE` 노출 금지)
- 모든 비즈니스 데이터는 `workspace_id` 격리 + RAG 전 Permission Check + Citation (ERD/API 명세 참고)
- 브랜치/커밋: `docs/Git_사용법.md`

## 로컬 실행 (스캐폴딩 후)

```bash
cd BE
./gradlew bootRun
# 또는
./mvnw spring-boot:run
```
