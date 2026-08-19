# BE 이슈 목록 (FE 연동 중 발견)

FE 대시보드/인증 플로우 연동 작업 중 실제 요청을 보내 확인한 서버 측 이슈를 모았습니다.
모든 항목은 로컬 환경(`localhost:8080`, Docker Postgres)에서 재현한 결과입니다.

---

## 1. 필수 헤더 누락 시 500 (FE에서 선반영, 확인 요청)

`@RequestHeader("X-Workspace-Id")` 가 필수인 API에 헤더 없이 요청하면
`MissingRequestHeaderException` 이 `GlobalExceptionHandler` 에 없어 500으로 나갑니다.

```bash
curl -X GET /api/v1/dashboard/me -H "Authorization: Bearer $TOKEN"
# 이전
{"code":"INTERNAL_ERROR","status":500,"message":"서버 오류가 발생했습니다."}
```

클라이언트가 "내 잘못(헤더 누락)"인지 "서버 장애"인지 구분할 수 없어 재시도 로직을 만들 수 없습니다.

**FE 작업 브랜치에서 아래와 같이 선반영했습니다.** 방향이 맞는지 확인 부탁드립니다.

```java
@ExceptionHandler(MissingRequestHeaderException.class)
public ResponseEntity<ErrorResponse> handleMissingHeader(
        MissingRequestHeaderException ex, HttpServletRequest request) {
    return build(ErrorCode.VALIDATION_ERROR, "필수 헤더가 없습니다: " + ex.getHeaderName(), request);
}
```

```bash
# 반영 후
{"code":"VALIDATION_ERROR","status":400,"message":"필수 헤더가 없습니다: X-Workspace-Id"}
```

---

## 2. 활성 계획이 있는 상태에서 계획 생성 시 500

`POST /api/v1/onboarding-plans/generate` — 이미 `ACTIVE` 계획이 있는 사용자가 다시 호출하면
DB 유니크 제약 위반이 그대로 500으로 나갑니다.

```
org.springframework.dao.DataIntegrityViolationException:
  duplicate key value violates unique constraint "uq_active_plan"
  Detail: Key (workspace_id, user_id)=(...) already exists.
```

**기대**: `409 CONFLICT` + "이미 진행 중인 계획이 있습니다. 재생성하려면 force 옵션을 사용하세요."

`force` 파라미터가 이미 요청 DTO에 있으므로, 서비스 레이어에서 기존 활성 계획을 먼저 조회해
`force=false` 면 409, `force=true` 면 기존 계획을 마감/교체하는 흐름이 자연스러워 보입니다.

---

## 3. `GeneratePlanRequest.force` 가 primitive 라 빈 body 요청이 500

```bash
curl -X POST /api/v1/onboarding-plans/generate -d '{}'
# {"code":"INTERNAL_ERROR","status":500}
```

```
HttpMessageNotReadableException: JSON parse error:
  Cannot map `null` into type `boolean`
```

`GeneratePlanRequest` 의 `boolean force` 가 primitive 라 필드가 없으면 역직렬화가 실패합니다.
세 필드 모두 선택값이라 `{}` 는 유효한 요청으로 보이는데 500이 납니다.

**제안**
- `boolean force` → `Boolean force` 로 변경하고 서비스에서 `Boolean.TRUE.equals(force)` 처리
- 함께 `HttpMessageNotReadableException` 핸들러를 추가해 잘못된 body 는 400으로 (현재 핸들러 없음)

---

## 4. `POST /auth/resend-verification` 이 항상 200

이메일 열거 방지를 위해 모든 경우에 동일한 200 응답을 주는 의도는 이해했습니다.
다만 **재전송 간격 제한(60초)에 걸려 실제로 메일이 나가지 않은 경우에도 200** 이라
FE 가 "코드를 보냈습니다"라고 안내하지만 실제로는 발송되지 않습니다.

```
가입 직후(60초 이내) resend 호출
→ 200 {"message":"등록된 이메일이라면 인증 코드가 발송됩니다."}
→ DB 확인 결과 code / last_sent_at 모두 변화 없음
```

기존 코드가 5분간 유효해 치명적이지는 않지만, 사용자가 새 메일을 기다리게 됩니다.

**제안 (택1)**
- 응답에 `retryAfterSeconds` 같은 힌트를 포함 (열거 방지와 무관한 정보)
- 또는 현재 스펙 유지 → FE 문구를 "이미 받으신 코드가 있다면 그대로 입력해 주세요"로 조정 (FE에서 처리 가능)

---

## 5. 알림(Notification) API 부재

대시보드 상단 알림 뱃지 / 알림 패널을 연동할 엔드포인트와 테이블이 없습니다.

```bash
curl /api/v1/notifications   # 500 (매핑 없음)
```

```
DB 테이블: audit_logs, chat_messages, chat_sessions, checklist_items,
          daily_recommendations, document_chunks, documents, invitations,
          jobs, memberships, onboarding_plan_items, onboarding_plans,
          onboarding_templates, users, workspaces
→ 알림 관련 테이블 없음
```

현재 FE 알림 패널은 하드코딩 상태이며, **BE 설계 없이는 실연동이 불가능**합니다.
필요 여부와 우선순위 판단 부탁드립니다.

---

## 6. 문서 업로드가 PDF 전용 — 의도 확인 필요

```bash
curl -X POST /api/v1/documents -F "file=@manual.txt"
# {"code":"VALIDATION_ERROR","status":400,
#  "message":"확장자가 .pdf인 파일만 업로드할 수 있습니다."}
```

FE 기획 화면은 XLSX / DOCX / PPTX 를 전제로 그려져 있습니다.
의도된 제약이면 FE 안내 문구와 필터를 PDF 기준으로 정리하겠습니다.
(현재는 전체 파일 모달의 유형 필터를 제거해 둔 상태입니다)

---

## 7. `GET /documents` 에 검색 파라미터 없음

현재 지원: `page`, `size`, `status`

파일명 키워드 검색이 없어 FE 전체 파일 목록의 검색창이 **현재 페이지 내 필터로만** 동작합니다.
`keyword` 또는 `q` 파라미터 추가를 검토 부탁드립니다.

---

## 8. `GET /progress/me` 가 계획 없을 때 404

```bash
curl /api/v1/progress/me
# {"code":"RESOURCE_NOT_FOUND","status":404,"message":"온보딩 계획이 없습니다."}
```

계획이 없으면 진행률이 없는 게 맞지만, 대시보드처럼 **여러 API 를 병렬 호출해 화면을 구성하는 쪽**에서는
정상 상태(=아직 계획 없음)가 404 로 오면 에러 처리와 구분이 어렵습니다.

참고로 `GET /dashboard/me` 는 같은 상황에서 200 + `plan: null` + 안내 `message` 를 주고 있어
같은 상황을 두 API 가 다르게 표현합니다. 한쪽으로 통일되면 좋겠습니다.

---

## 참고: FE 쪽에서 자체 수정한 응답 스펙 불일치

BE 는 정상이고 FE 타입이 틀렸던 항목입니다. **BE 작업은 필요 없습니다.** 참고용으로만 남깁니다.

| API | 실제 응답 | FE 가 기대하던 것 |
| --- | --- | --- |
| `GET /workspaces/me` | `{ items: [...] }` | `{ workspaces: [...] }` |
| `GET /documents` | `{ items, page, size, totalElements, totalPages }` | `{ content, currentPage, pageSize }` |
| `GET /documents` 항목 | `title`, `mimeType`, `sizeBytes` | `name`, `type`, `size` |
| `POST /workspaces` | `slug` 필수 | 미전송 (400 발생) |
| `POST /chat/messages` | `{ sessionId, messageId, role, answer, citations, ... }` | `{ id, sessionId, content }` |
