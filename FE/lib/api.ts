import { getAuthToken, getWorkspaceId, clearAuthToken } from './storage';
import { API_BASE } from './config';

/**
 * 공통 fetch 래퍼.
 * 401 이면 저장된 인증 정보를 버리고 로그인 화면으로 보낸다.
 * (토큰 만료를 화면마다 처리하지 않기 위한 것)
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) {
    clearAuthToken();
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (!pathname.startsWith('/login') && !pathname.startsWith('/signup') && !pathname.startsWith('/verify-email')) {
        window.location.href = '/login?expired=true';
      }
    }
  }
  return response;
}

/** 토큰만 필요한 요청 (워크스페이스 밖에서도 부를 수 있는 API) */
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 정보 없음');
  return { Authorization: `Bearer ${token}`, ...extra };
}

/**
 * 워크스페이스 컨텍스트가 필요한 요청.
 * 서버는 X-Workspace-Id 가 없으면 500 을 주므로 여기서 먼저 막는다.
 */
function workspaceHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');
  return { Authorization: `Bearer ${token}`, 'X-Workspace-Id': wsId, ...extra };
}

const JSON_CONTENT = { 'Content-Type': 'application/json' } as const;

/** 서버 에러 본문(ErrorResponse)에서 메시지를 꺼낸다 */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return (body && (body.message || body.error)) || fallback;
}

/**
 * 서버 공통 페이지네이션 응답 (global/web/PageResponse).
 * 목록 키는 content 가 아니라 items 다.
 */
export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** 워크스페이스에서의 내 역할 (서버 UserRole) */
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'NEW_HIRE';

/** 계획/체크리스트/추천 항목의 상태 (서버 ItemStatus) */
export type ItemStatus = 'PENDING' | 'DONE' | 'SKIPPED' | 'DISMISSED';

/** 계획 항목 종류 (서버 PlanItemType) */
export type PlanItemType = 'DOCUMENT' | 'PERSON' | 'CHECKLIST' | 'PRACTICE';

/** 계획 상태 (서버 PlanStatus) */
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

// ===== Dashboard =====
/** 대시보드 today.items 항목. 서버 RecommendationResponse 와 같은 모양이다 */
export interface DashboardRecommendation {
  id: string;
  type: PlanItemType;
  title: string;
  status: ItemStatus;
  priority: number;
  source: string | null;
  planItemId: string | null;
  documentId: string | null;
  personName: string | null;
}

/** GET /dashboard/me (서버 DashboardResponse 와 1:1) */
export interface DashboardResponse {
  progressPercent: number;
  today: {
    total: number;
    done: number;
    items: DashboardRecommendation[];
  };
  plan: {
    planId: string | null;
    currentDay: number;
    totalDays: number;
    status: PlanStatus | null;
  } | null;
  checklist: {
    total: number;
    done: number;
  };
  message: string | null;
}

export async function getDashboard(): Promise<DashboardResponse> {
  const response = await apiFetch(`${API_BASE}/dashboard/me`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '대시보드 조회 실패'));
  return response.json();
}

// ===== Recommendations (오늘 할 일) =====
/** GET /recommendations/today 항목 (서버 RecommendationResponse 와 1:1) */
export type RecommendationResponse = DashboardRecommendation;

export interface TodayRecommendationsResponse {
  /** 조회 기준 날짜 (yyyy-MM-dd) */
  date: string;
  items: RecommendationResponse[];
}

export async function getRecommendationsToday(date?: string): Promise<TodayRecommendationsResponse> {
  const query = date ? `?date=${date}` : '';
  const response = await apiFetch(`${API_BASE}/recommendations/today${query}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '오늘 할 일 조회 실패'));
  return response.json();
}

export async function completeRecommendation(recommendationId: string): Promise<RecommendationResponse> {
  const response = await apiFetch(`${API_BASE}/recommendations/${recommendationId}/complete`, {
    method: 'POST',
    headers: workspaceHeaders(JSON_CONTENT),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '할 일 완료 실패'));
  return response.json();
}

export async function dismissRecommendation(recommendationId: string): Promise<RecommendationResponse> {
  const response = await apiFetch(`${API_BASE}/recommendations/${recommendationId}/dismiss`, {
    method: 'POST',
    headers: workspaceHeaders(JSON_CONTENT),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '추천 숨김 실패'));
  return response.json();
}

// ===== Onboarding Plans (30일 계획) =====
/** GET /onboarding-plans/me 항목 (서버 PlanItemResponse 와 1:1) */
export interface PlanItemResponse {
  id: string;
  /** 며칠차인지 (1~30). 서버 필드명이 day 가 아니라 dayIndex 다 */
  dayIndex: number;
  type: PlanItemType;
  title: string;
  description: string | null;
  status: ItemStatus;
  documentId: string | null;
  personName: string | null;
  completedAt: string | null;
}

/** GET /onboarding-plans/me (서버 PlanResponse 와 1:1) */
export interface PlanResponse {
  /** 서버 필드명이 id 가 아니라 planId 다 */
  planId: string;
  userId: string;
  status: PlanStatus;
  version: number;
  startDate: string;
  endDate: string;
  progressPercent: number;
  itemCount: number;
  items: PlanItemResponse[] | null;
}

export async function getOnboardingPlan(includeItems: boolean = true): Promise<PlanResponse> {
  const response = await apiFetch(`${API_BASE}/onboarding-plans/me?includeItems=${includeItems}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '30일 계획 조회 실패'));
  return response.json();
}

export interface GeneratePlanOptions {
  /** 이 템플릿으로 만든다. 비우면 서버가 역할용 → 기본 → 기본 골격 순으로 고른다 */
  templateId?: string;
  /** 이미 활성 계획이 있어도 기존 것을 보관하고 새로 만든다 */
  force?: boolean;
}

/**
 * 계획 생성.
 *
 * 템플릿을 골라 다시 만들려면 force=true 로 이 함수를 쓴다.
 * regenerateOnboardingPlan 은 완료 항목을 유지하지만 서버가 templateId 를 받지 않아
 * 템플릿을 지정할 수 없다.
 */
export async function generateOnboardingPlan(
  options: GeneratePlanOptions = {}
): Promise<PlanResponse> {
  const body: Record<string, unknown> = { force: options.force ?? false };
  if (options.templateId) body.templateId = options.templateId;

  const response = await apiFetch(`${API_BASE}/onboarding-plans/generate`, {
    method: 'POST',
    headers: workspaceHeaders(JSON_CONTENT),
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '계획 생성 실패'));
  return response.json();
}

export async function getOnboardingPlanById(planId: string): Promise<PlanResponse> {
  const response = await apiFetch(`${API_BASE}/onboarding-plans/${planId}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '계획 조회 실패'));
  return response.json();
}

/** 계획 재생성 (Admin). keepCompleted=true 면 이미 완료한 항목은 유지한다 */
export async function regenerateOnboardingPlan(
  planId: string,
  keepCompleted: boolean = true
): Promise<PlanResponse> {
  const response = await apiFetch(
    `${API_BASE}/onboarding-plans/${planId}/regenerate?keepCompleted=${keepCompleted}`,
    {
      method: 'POST',
      headers: workspaceHeaders(JSON_CONTENT),
    }
  );

  if (!response.ok) throw new Error(await errorMessage(response, '계획 재생성 실패'));
  return response.json();
}

export async function updatePlanItemStatus(itemId: string, status: ItemStatus): Promise<PlanItemResponse> {
  const response = await apiFetch(`${API_BASE}/onboarding-plans/items/${itemId}`, {
    method: 'PATCH',
    headers: workspaceHeaders(JSON_CONTENT),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '계획 항목 상태 변경 실패'));
  return response.json();
}

// ===== Checklists =====
/** GET /checklists/me 항목 (서버 ChecklistResponse 와 1:1) */
export interface ChecklistItemResponse {
  id: string;
  title: string;
  status: ItemStatus;
  /** 며칠차까지 끝내야 하는지 */
  dueDay: number | null;
  completedAt: string | null;
}

/** GET /checklists/me (서버 ChecklistSummaryResponse 와 1:1) */
export interface ChecklistSummaryResponse {
  items: ChecklistItemResponse[];
  total: number;
  done: number;
  progressPercent: number;
}

export type ChecklistStatusFilter = 'ALL' | 'PENDING' | 'DONE';

export async function getChecklists(status: ChecklistStatusFilter = 'ALL'): Promise<ChecklistSummaryResponse> {
  const response = await apiFetch(`${API_BASE}/checklists/me?status=${status}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '체크리스트 조회 실패'));
  return response.json();
}

export async function updateChecklistItemStatus(
  itemId: string,
  status: ItemStatus
): Promise<ChecklistItemResponse> {
  const response = await apiFetch(`${API_BASE}/checklists/items/${itemId}`, {
    method: 'PATCH',
    headers: workspaceHeaders(JSON_CONTENT),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '체크리스트 상태 변경 실패'));
  return response.json();
}

// ===== Progress =====
/** GET /progress/me (서버 MyProgressResponse 와 1:1) */
export interface MyProgressResponse {
  progressPercent: number;
  completedItems: number;
  totalItems: number;
  overdueItems: Array<{ id: string; title: string; dayIndex: number }>;
  bottlenecks: string[];
}

export async function getMyProgress(): Promise<MyProgressResponse> {
  const response = await apiFetch(`${API_BASE}/progress/me`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '진행 현황 조회 실패'));
  return response.json();
}

/** GET /admin/progress 항목 (서버 AdminProgressItemResponse 와 1:1) */
export interface AdminProgressItemResponse {
  userId: string;
  name: string;
  email: string;
  progressPercent: number;
  status: string;
  planId: string | null;
  currentDay: number;
}

export type AdminProgressListResponse = PageResponse<AdminProgressItemResponse>;

export async function getAdminProgress(page: number = 0, size: number = 20): Promise<AdminProgressListResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });

  const response = await apiFetch(`${API_BASE}/admin/progress?${params}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '신입 진행 현황 조회 실패'));
  return response.json();
}

/** GET /admin/progress/{userId} (서버 AdminProgressDetailResponse 와 1:1) */
export interface AdminProgressDetailResponse {
  userId: string;
  name: string;
  email: string;
  progressPercent: number;
  planId: string | null;
  overdueItems: Array<{ id: string; title: string; dayIndex: number }>;
  insights: string | null;
}

export async function getAdminProgressDetail(userId: string): Promise<AdminProgressDetailResponse> {
  const response = await apiFetch(`${API_BASE}/admin/progress/${userId}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '신입 상세 조회 실패'));
  return response.json();
}

// ===== Chat =====
/** 서버가 답변에 붙여 주는 근거 조각 (ChatService 가 만드는 Map 과 1:1) */
export interface ChatCitation {
  documentId?: string;
  title?: string;
  chunkId?: string;
  snippet?: string;
  page?: number | null;
}

export interface ChatSessionSummaryResponse {
  id: string;
  title: string;
  updatedAt: string;
}

/** 서버 ChatMessageResponse 와 1:1. role 은 'user' | 'assistant' */
export interface ChatMessageResponse {
  id: string;
  role: string;
  content: string;
  citations?: ChatCitation[];
  createdAt?: string;
}

export interface ChatSessionDetailResponse {
  id: string;
  messages: ChatMessageResponse[];
}

/** POST /chat/messages 요청 (서버 SendMessageRequest 와 1:1) */
export interface SendMessageRequest {
  message: string;
  /** 주지 않으면 서버가 새 세션을 만든다 */
  sessionId?: string;
  stream?: boolean;
}

/** POST /chat/messages 응답 (서버 SendMessageResponse 와 1:1) */
export interface SendMessageResponse {
  sessionId: string;
  messageId: string;
  role: string;
  /** 답변 본문. 서버 필드명이 content 가 아니라 answer 다 */
  answer: string;
  citations?: ChatCitation[];
  /** 권한이 없어 참조하지 못한 문서 */
  permissionDeniedDocumentIds?: string[];
  createdAt?: string;
}

export async function getChatSessions(): Promise<{ items: ChatSessionSummaryResponse[] }> {
  const response = await apiFetch(`${API_BASE}/chat/sessions`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '채팅 세션 조회 실패'));
  return response.json();
}

export async function getChatSessionDetail(sessionId: string): Promise<ChatSessionDetailResponse> {
  const response = await apiFetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '세션 상세 조회 실패'));
  return response.json();
}

export async function sendChatMessage(message: string, sessionId?: string): Promise<SendMessageResponse> {
  const response = await apiFetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: workspaceHeaders(JSON_CONTENT),
    // sessionId 를 주지 않으면 서버가 새 세션을 만든다
    body: JSON.stringify(sessionId ? { message, sessionId } : { message }),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '메시지 전송 실패'));
  return response.json();
}

/** 인용을 화면에 쓸 한 줄로 (제목 + 쪽수) */
export function citationTitle(citation: ChatCitation): string {
  const title = citation.title ?? citation.documentId ?? '참고 문서';
  return citation.page ? `${title} · ${citation.page}쪽` : title;
}

// ===== Members =====
/** 서버 MembershipStatus */
export type MembershipStatus = 'ACTIVE' | 'DISABLED';

/** GET /members 항목 (서버 MemberResponse 와 1:1) */
export interface MemberResponse {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: MembershipStatus;
  department: string | null;
  careerLevel: string | null;
  title: string | null;
}

export type MemberListResponse = PageResponse<MemberResponse>;

export async function getMembers(
  page: number = 0,
  size: number = 20,
  role?: WorkspaceRole
): Promise<MemberListResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (role) params.set('role', role);

  const response = await apiFetch(`${API_BASE}/members?${params}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '멤버 목록 조회 실패'));
  return response.json();
}

/** PATCH /members/{memberId} - 역할과 상태를 함께 보낼 수 있다 */
export async function updateMember(
  memberId: string,
  patch: { role?: WorkspaceRole; status?: MembershipStatus }
): Promise<MemberResponse> {
  const response = await apiFetch(`${API_BASE}/members/${memberId}`, {
    method: 'PATCH',
    headers: workspaceHeaders(JSON_CONTENT),
    body: JSON.stringify(patch),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '멤버 정보 변경 실패'));
  return response.json();
}

export async function updateMemberRole(memberId: string, role: WorkspaceRole): Promise<MemberResponse> {
  return updateMember(memberId, { role });
}

/** GET /members 초대 응답 (서버 InvitationResponse 와 1:1) */
export interface InvitationResponse {
  invitationId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: string;
  status: InvitationStatus;
}

export interface InviteMemberPayload {
  email: string;
  role?: WorkspaceRole;
  department?: string;
  careerLevel?: string;
  title?: string;
}

export async function inviteMember(payload: InviteMemberPayload): Promise<InvitationResponse> {
  const response = await apiFetch(`${API_BASE}/members/invitations`, {
    method: 'POST',
    headers: workspaceHeaders(JSON_CONTENT),
    body: JSON.stringify({ role: 'NEW_HIRE', ...payload }),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '멤버 초대 실패'));
  return response.json();
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

/** GET /members/invitations 목록 한 줄 (서버 InvitationListItemResponse 와 1:1) */
export interface InvitationListItem {
  invitationId: string;
  email: string;
  role: WorkspaceRole;
  department: string | null;
  careerLevel: string | null;
  title: string | null;
  status: InvitationStatus;
  /** status 가 PENDING 이어도 기한이 지났으면 true */
  expired: boolean;
  inviterName: string | null;
  expiresAt: string;
  createdAt: string;
}

/**
 * 보낸 초대 목록. 수락 전 초대는 멤버 목록(GET /members)에 나타나지 않으므로
 * "누구에게 초대를 보냈는지" 는 이 API 로만 확인할 수 있다.
 */
export async function getInvitations(
  page = 0,
  size = 20,
  status?: InvitationStatus
): Promise<PageResponse<InvitationListItem>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set('status', status);

  const response = await apiFetch(`${API_BASE}/members/invitations?${params.toString()}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '초대 목록을 불러오지 못했습니다.'));
  return response.json();
}

/** 초대 취소. 취소하면 같은 주소로 다시 초대할 수 있다 (OWNER/ADMIN 만) */
export async function revokeInvitation(invitationId: string): Promise<void> {
  const response = await apiFetch(`${API_BASE}/members/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '초대 취소에 실패했습니다.'));
}

/** 초대 재발송. 토큰은 유지되고 기한만 7일 뒤로 늘어난다 (OWNER/ADMIN 만) */
export async function resendInvitation(invitationId: string): Promise<InvitationResponse> {
  const response = await apiFetch(`${API_BASE}/members/invitations/${invitationId}/resend`, {
    method: 'POST',
    headers: workspaceHeaders(JSON_CONTENT),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '초대 재발송에 실패했습니다.'));
  return response.json();
}

/** GET /members/invitations/{token} 응답 (서버 InvitationPreviewResponse 와 1:1) */
export interface InvitationPreview {
  /** 초대받은 주소. 이 계정으로만 수락할 수 있다 */
  email: string;
  workspaceName: string;
  inviterName: string | null;
  role: WorkspaceRole;
  department: string | null;
  title: string | null;
  expiresAt: string;
  status: InvitationStatus;
  /** false 면 acceptBlockedReason 에 이유가 담긴다 */
  acceptable: boolean;
  acceptBlockedReason: string | null;
}

/**
 * 초대 내용 조회. 토큰을 아는 것 자체가 인증이라 로그인 없이 부를 수 있다.
 * 수락 화면에서 로그인 전에 "어느 팀에, 누가, 어떤 주소로" 초대했는지 보여 주기 위한 것.
 */
export async function getInvitationPreview(invitationToken: string): Promise<InvitationPreview> {
  // 인증 헤더를 붙이지 않는다. 만료된 토큰이 남아 있어도 401 로 로그인 화면에 튕기지 않도록
  // apiFetch 대신 fetch 를 직접 쓴다.
  const response = await fetch(`${API_BASE}/members/invitations/${encodeURIComponent(invitationToken)}`);

  if (!response.ok) throw new Error(await errorMessage(response, '초대 정보를 불러오지 못했습니다.'));
  return response.json();
}

/** POST /members/invitations/{token}/accept (서버 AcceptInvitationResponse 와 1:1) */
export interface AcceptInvitationResponse {
  workspaceId: string;
  role: WorkspaceRole;
  membershipId: string;
  onboardingPlanId: string | null;
}

/**
 * 초대 수락. 로그인한 사용자 기준으로 처리되므로 토큰이 반드시 필요하다.
 * (초대받은 주소와 로그인한 계정이 다르면 서버가 403 을 준다)
 */
export async function acceptMemberInvitation(invitationToken: string): Promise<AcceptInvitationResponse> {
  const response = await apiFetch(`${API_BASE}/members/invitations/${invitationToken}/accept`, {
    method: 'POST',
    headers: authHeaders(JSON_CONTENT),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '초대 수락 실패'));
  return response.json();
}

// ===== Documents =====
export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type DocumentVisibility = 'WORKSPACE' | 'RESTRICTED';

/** GET /documents 응답 항목 (서버 DocumentResponse 와 1:1) */
export interface DocumentResponse {
  id: string;
  title: string;
  status: DocumentStatus;
  visibility: DocumentVisibility | null;
  allowedRoles: string[] | null;
  mimeType: string | null;
  sizeBytes: number | null;
  chunkCount: number | null;
  errorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type DocumentPageResponse = PageResponse<DocumentResponse>;

export interface DocumentListParams {
  page?: number;
  size?: number;
  status?: DocumentStatus;
}

export async function getDocuments(params: DocumentListParams = {}): Promise<DocumentPageResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.status) query.set('status', params.status);

  const response = await apiFetch(`${API_BASE}/documents?${query}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '파일 목록 조회 실패'));
  return response.json();
}

/** 서버가 주는 바이트 크기를 화면용 문자열로 */
export function formatFileSize(bytes?: number | null): string {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
}

/** mimeType 에서 화면에 쓸 확장자 라벨을 뽑는다 */
export function formatFileType(mimeType?: string | null, title?: string): string {
  const fromTitle = title?.includes('.') ? title.split('.').pop()?.toUpperCase() : undefined;
  if (fromTitle && fromTitle.length <= 5) return fromTitle;
  if (!mimeType) return 'FILE';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLSX';
  if (mimeType.includes('word')) return 'DOCX';
  if (mimeType.includes('presentation')) return 'PPTX';
  if (mimeType.includes('text')) return 'TXT';
  return mimeType.split('/').pop()?.toUpperCase() ?? 'FILE';
}

/** 서버가 주는 Instant(ISO) 를 화면용 날짜/시간으로 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface UploadDocumentParams {
  file: File;
  title?: string;
  visibility?: DocumentVisibility;
  /** RESTRICTED 일 때 접근을 허용할 역할 */
  allowedRoles?: WorkspaceRole[];
}

export async function uploadDocument(params: UploadDocumentParams): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append('file', params.file);

  const query = new URLSearchParams();
  if (params.title) query.set('title', params.title);
  if (params.visibility) query.set('visibility', params.visibility);
  if (params.allowedRoles?.length) query.set('allowedRoles', params.allowedRoles.join(','));
  const suffix = query.toString() ? `?${query}` : '';

  // Content-Type 은 브라우저가 boundary 와 함께 직접 넣어야 한다
  const response = await apiFetch(`${API_BASE}/documents${suffix}`, {
    method: 'POST',
    headers: workspaceHeaders(),
    body: formData,
  });

  if (!response.ok) throw new Error(await errorMessage(response, '파일 업로드 실패'));
  return response.json();
}

export async function getDocumentDetail(documentId: string): Promise<DocumentResponse> {
  const response = await apiFetch(`${API_BASE}/documents/${documentId}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '문서 조회 실패'));
  return response.json();
}

export async function reprocessDocument(documentId: string): Promise<DocumentResponse> {
  const response = await apiFetch(`${API_BASE}/documents/${documentId}/reprocess`, {
    method: 'POST',
    headers: workspaceHeaders(JSON_CONTENT),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '문서 재처리 실패'));
  return response.json();
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await apiFetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE',
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '문서 삭제 실패'));
}

// ===== Workspace =====
/** POST /workspaces, PATCH /workspaces/{id} (서버 WorkspaceResponse 와 1:1) */
export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

/** GET /workspaces/me 항목 (서버 WorkspaceSummaryResponse 와 1:1) */
export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
}

/** 서버는 items 로 내려준다 (workspaces 아님) */
export interface WorkspaceListResponse {
  items: WorkspaceSummary[];
}

export async function getMyWorkspaces(): Promise<WorkspaceListResponse> {
  const response = await apiFetch(`${API_BASE}/workspaces/me`, {
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '워크스페이스 목록 조회 실패'));
  return response.json();
}

export class WorkspaceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'WorkspaceError';
  }

  isConflict(): boolean {
    return this.status === 409;
  }
}

/** 서버는 name 과 slug 를 모두 요구한다 (slug: ^[a-z0-9]+(?:-[a-z0-9]+)*$, 2~80자) */
export async function createWorkspace(name: string, slug: string): Promise<WorkspaceResponse> {
  const response = await apiFetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: authHeaders(JSON_CONTENT),
    body: JSON.stringify({ name, slug }),
  });

  if (!response.ok) {
    // slug 중복(409) / 형식 오류(400) 를 구분해서 보여줘야 해서 상태 코드를 함께 올린다
    throw new WorkspaceError(response.status, await errorMessage(response, '워크스페이스 생성 실패'));
  }
  return response.json();
}

export async function updateWorkspace(workspaceId: string, name: string): Promise<WorkspaceResponse> {
  const response = await apiFetch(`${API_BASE}/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: authHeaders(JSON_CONTENT),
    body: JSON.stringify({ name }),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '워크스페이스 수정 실패'));
  return response.json();
}

// ===== Templates =====
/** 서버 TemplateItemResponse 와 1:1 */
export interface TemplateItemResponse {
  id: string;
  dayIndex: number;
  type: PlanItemType;
  title: string;
  description: string | null;
  sortOrder: number;
}

/** GET /templates 항목 (서버 TemplateResponse 와 1:1) */
export interface TemplateResponse {
  id: string;
  name: string;
  /** 서버 필드명이 role 이 아니라 targetRole 이다 */
  targetRole: WorkspaceRole | null;
  description: string | null;
  isDefault: boolean;
  updatedAt: string | null;
  items: TemplateItemResponse[] | null;
}

/** 서버는 items 키로 감싸서 내려준다 */
export interface TemplateListResponse {
  items: TemplateResponse[];
}

export async function getTemplates(): Promise<TemplateListResponse> {
  const response = await apiFetch(`${API_BASE}/templates`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '템플릿 목록 조회 실패'));
  return response.json();
}

export async function getTemplateDetail(templateId: string): Promise<TemplateResponse> {
  const response = await apiFetch(`${API_BASE}/templates/${templateId}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '템플릿 조회 실패'));
  return response.json();
}

export interface TemplateItemPayload {
  dayIndex: number;
  type: PlanItemType;
  title: string;
  description?: string;
  sortOrder?: number;
}

export interface TemplatePayload {
  name: string;
  targetRole?: WorkspaceRole;
  description?: string;
  isDefault?: boolean;
  items?: TemplateItemPayload[];
}

/** POST /templates/generate 요청 */
export interface GenerateTemplatePayload {
  targetRole?: WorkspaceRole;
  department?: string;
  /** 근거로 쓸 문서. 비우면 워크스페이스의 READY 문서를 모두 사용한다 */
  documentIds?: string[];
  /** 7~30. 비우면 30 */
  planDays?: number;
}

/** POST /templates/generate 응답 (서버 GeneratedTemplateResponse 와 1:1) */
export interface GeneratedTemplateResponse {
  name: string;
  targetRole: WorkspaceRole;
  description: string | null;
  /** createTemplate 의 items 와 같은 모양이라 그대로 저장 요청에 넣을 수 있다 */
  items: TemplateItemPayload[];
  sourceDocuments: string[];
  /** false 면 AI 를 쓸 수 없어 기본 골격으로 대체된 것 */
  aiGenerated: boolean;
  fallbackReason: string | null;
  model: string | null;
}

/**
 * 업로드된 문서를 근거로 템플릿 초안을 생성한다. 저장되지 않으므로
 * 화면에서 검토·수정한 뒤 createTemplate 으로 저장해야 한다.
 * LLM 호출이 포함되어 10초 이상 걸릴 수 있다.
 */
export async function generateTemplate(
  payload: GenerateTemplatePayload
): Promise<GeneratedTemplateResponse> {
  const response = await apiFetch(`${API_BASE}/templates/generate`, {
    method: 'POST',
    headers: workspaceHeaders(JSON_CONTENT),
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await errorMessage(response, 'AI 템플릿 생성 실패'));
  return response.json();
}

export async function createTemplate(payload: TemplatePayload): Promise<TemplateResponse> {
  const response = await apiFetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: workspaceHeaders(JSON_CONTENT),
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '템플릿 생성 실패'));
  return response.json();
}

/** @deprecated 이름을 createTemplate 으로 정리했다. 예전 호출부 호환용 별칭. */
export const createTemplateAPI = createTemplate;

export async function updateTemplate(
  templateId: string,
  payload: Partial<TemplatePayload>
): Promise<TemplateResponse> {
  const response = await apiFetch(`${API_BASE}/templates/${templateId}`, {
    method: 'PATCH',
    headers: workspaceHeaders(JSON_CONTENT),
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '템플릿 수정 실패'));
  return response.json();
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const response = await apiFetch(`${API_BASE}/templates/${templateId}`, {
    method: 'DELETE',
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '템플릿 삭제 실패'));
}

// ===== Audit Logs =====
/** GET /admin/audit-logs 항목 (서버 AuditLogResponse 와 1:1) */
export interface AuditLogResponse {
  id: string;
  eventType: string;
  actorId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  result: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type AuditLogPageResponse = PageResponse<AuditLogResponse>;

export interface AuditLogParams {
  page?: number;
  size?: number;
  actorId?: string;
  eventType?: string;
  /** ISO-8601 (예: 2026-08-11T00:00:00Z) */
  from?: string;
  to?: string;
}

export async function getAuditLogs(params: AuditLogParams = {}): Promise<AuditLogPageResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 50),
  });
  if (params.actorId) query.set('actorId', params.actorId);
  if (params.eventType) query.set('eventType', params.eventType);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);

  const response = await apiFetch(`${API_BASE}/admin/audit-logs?${query}`, {
    headers: workspaceHeaders(),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '감사 로그 조회 실패'));
  return response.json();
}

// ===== Auth 요청 타입 (서버 SignupRequest / VerifyEmailRequest 와 1:1) =====
export interface SignupRequest {
  email: string;
  name: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  /** 6자리 인증 코드 */
  code: string;
}

// ===== Email Verification =====
export interface VerifyEmailResponse {
  email: string;
  message: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export async function verifyEmail(email: string, code: string): Promise<VerifyEmailResponse> {
  const response = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: JSON_CONTENT,
    body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '이메일 인증 실패'));
  return response.json();
}

export async function resendVerificationCode(email: string): Promise<ResendVerificationResponse> {
  const response = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
    headers: JSON_CONTENT,
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });

  if (!response.ok) throw new Error(await errorMessage(response, '코드 재전송 실패'));
  return response.json();
}
