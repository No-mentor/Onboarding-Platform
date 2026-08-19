import { getAuthToken, getWorkspaceId, clearAuthToken } from './storage';

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')}/api/v1`
    : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1')
).replace(/\/+$/, '');

/**
 * 공통 fetch 래퍼: 401 Unauthorized 발생 시 인증 정보를 삭제하고 로그인 페이지로 자동 리다이렉트
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

// ===== Dashboard =====
export interface DashboardRecommendation {
  id: string;
  type: string;
  title: string;
  status: string;
  priority: number;
  source: string;
  planItemId: string;
  documentId: string;
  personName: string;
}

export interface DashboardResponse {
  progressPercent: number;
  today: {
    total: number;
    done: number;
    items: DashboardRecommendation[];
  };
  plan: {
    planId: string;
    currentDay: number;
    totalDays: number;
    status: string;
  };
  checklist: {
    total: number;
    done: number;
  };
  message: string;
}

export async function getDashboard(): Promise<DashboardResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/dashboard/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('대시보드 조회 실패');
  return response.json();
}

// ===== Recommendations (오늘 할 일) =====
export interface RecommendationResponse {
  id: string;
  title: string;
  label: string;
  time: string;
  status?: string;
}

export interface TodayRecommendationsResponse {
  items: RecommendationResponse[];
}

export async function getRecommendationsToday(): Promise<TodayRecommendationsResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/recommendations/today`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('오늘 할 일 조회 실패');
  return response.json();
}

export async function completeRecommendation(recommendationId: string): Promise<RecommendationResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/recommendations/${recommendationId}/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('할 일 완료 실패');
  return response.json();
}

// ===== Onboarding Plans (30일 계획) =====
export interface PlanItemResponse {
  id: string;
  day: number;
  title: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  description?: string;
}

export interface PlanResponse {
  id: string;
  userId: string;
  totalDays: number;
  currentDay: number;
  items?: PlanItemResponse[];
  createdAt: string;
}

export async function getOnboardingPlan(includeItems: boolean = true): Promise<PlanResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/onboarding-plans/me?includeItems=${includeItems}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('30일 계획 조회 실패');
  return response.json();
}

export async function generateOnboardingPlan(): Promise<PlanResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/onboarding-plans/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('계획 생성 실패');
  return response.json();
}

export async function updatePlanItemStatus(itemId: string, status: string): Promise<PlanItemResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/onboarding-plans/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) throw new Error('계획 항목 상태 변경 실패');
  return response.json();
}

// ===== Checklists =====
export interface ChecklistItemResponse {
  id: string;
  title: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt?: string;
}

export interface ChecklistSummaryResponse {
  items: ChecklistItemResponse[];
  totalCount: number;
  completedCount: number;
}

export async function getChecklists(): Promise<ChecklistSummaryResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/checklists/me?status=ALL`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('체크리스트 조회 실패');
  return response.json();
}

export async function updateChecklistItemStatus(itemId: string, status: string): Promise<ChecklistItemResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/checklists/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) throw new Error('체크리스트 상태 변경 실패');
  return response.json();
}

// ===== Progress =====
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
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const params = new URLSearchParams({ page: page.toString(), size: size.toString() });

  const response = await apiFetch(`${API_BASE}/admin/progress?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('신입 진행 현황 조회 실패');
  return response.json();
}

// ===== Chat =====
export interface ChatSessionSummaryResponse {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessageResponse {
  id: string;
  type: 'user' | 'ai';
  content: string;
  citations?: Array<{ name: string; type?: string }>;
  createdAt?: string;
}

export interface ChatSessionDetailResponse {
  id: string;
  title: string;
  messages: ChatMessageResponse[];
}

export interface SendMessageRequest {
  message: string;
  sessionId?: string;
}

/** POST /chat/messages 응답 (서버 SendMessageResponse 와 1:1) */
export interface SendMessageResponse {
  sessionId: string;
  messageId: string;
  role: string;
  /** 답변 본문. 서버 필드명이 content 가 아니라 answer 다 */
  answer: string;
  citations?: Array<Record<string, unknown>>;
  /** 권한이 없어 참조하지 못한 문서 */
  permissionDeniedDocumentIds?: string[];
  createdAt?: string;
}

export async function getChatSessions(): Promise<{ items: ChatSessionSummaryResponse[] }> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/chat/sessions`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
    }
    throw new Error('채팅 세션 조회 실패');
  }
  return response.json();
}

export async function getChatSessionDetail(sessionId: string): Promise<ChatSessionDetailResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
    }
    throw new Error('세션 상세 조회 실패');
  }
  return response.json();
}

export async function sendChatMessage(message: string, sessionId?: string): Promise<SendMessageResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
    }
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.message || '메시지 전송에 실패했습니다.');
  }
  return response.json();
}

export async function deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
    }
    throw new Error('채팅 세션 삭제 실패');
  }
  return response.json();
}

// ===== Members =====
export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'LEFT';

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

export async function getMembers(page: number = 0, size: number = 20): Promise<MemberListResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const params = new URLSearchParams({ page: page.toString(), size: size.toString() });

  const response = await apiFetch(`${API_BASE}/members?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('멤버 목록 조회 실패');
  return response.json();
}

export interface InvitationResponse {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  status: string;
}

// ===== Document Detail & Upload =====
export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

/** GET /documents 응답 항목 (서버 DocumentResponse 와 1:1) */
export interface DocumentResponse {
  id: string;
  title: string;
  status: DocumentStatus;
  visibility?: string;
  allowedRoles?: string[];
  mimeType?: string | null;
  sizeBytes?: number | null;
  chunkCount?: number | null;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type DocumentPageResponse = PageResponse<DocumentResponse>;

export interface DocumentListParams {
  page?: number;
  size?: number;
  status?: DocumentStatus;
}

export async function getDocuments(params: DocumentListParams = {}): Promise<DocumentPageResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.status) query.set('status', params.status);

  const response = await apiFetch(`${API_BASE}/documents?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('파일 목록 조회 실패');
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

export async function uploadDocument(formData: FormData): Promise<DocumentResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
    body: formData,
  });

  if (!response.ok) throw new Error('파일 업로드 실패');
  return response.json();
}

export async function getDocumentDetail(documentId: string): Promise<DocumentResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/documents/${documentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('문서 조회 실패');
  return response.json();
}

// ===== Workspace =====
export interface WorkspaceResponse {
  id: string;
  name: string;
  slug?: string;
  memberCount?: number;
  createdAt?: string;
}

/** 워크스페이스에서의 내 역할 */
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'NEW_HIRE';

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
  const token = getAuthToken();
  if (!token) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/workspaces/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error('Workspace 목록 조회 실패');
  return response.json();
}

export async function createWorkspace(name: string, slug: string): Promise<WorkspaceResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, slug }),
  });

  if (!response.ok) {
    // slug 중복(409) / 형식 오류(400) 를 구분해서 보여줘야 해서 서버 메시지를 그대로 올린다
    const error = await response.json().catch(() => ({}));
    throw new WorkspaceError(response.status, error.message || 'Workspace 생성 실패');
  }
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

export async function updateWorkspace(workspaceId: string, name: string): Promise<WorkspaceResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) throw new Error('Workspace 수정 실패');
  return response.json();
}

// ===== Templates =====
export interface TemplateResponse {
  id: string;
  name: string;
  role: string;
  status?: string;
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateListResponse {
  items: TemplateResponse[];
}

export async function getTemplates(): Promise<TemplateListResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/templates`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('템플릿 목록 조회 실패');
  return response.json();
}

export async function createTemplateAPI(data: { name: string }): Promise<TemplateResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('템플릿 생성 실패');
  return response.json();
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/templates/${templateId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('템플릿 삭제 실패');
}

// ===== Member Role & Invitation =====
export async function updateMemberRole(memberId: string, role: string): Promise<MemberResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/members/${memberId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) throw new Error('멤버 역할 변경 실패');
  return response.json();
}

export async function acceptMemberInvitation(token: string): Promise<{ success: boolean }> {
  const response = await apiFetch(`${API_BASE}/members/invitations/${token}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('초대 수락 실패');
  return response.json();
}

// ===== Recommendation Actions =====
export async function dismissRecommendation(recommendationId: string): Promise<void> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/recommendations/${recommendationId}/dismiss`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('추천 숨김 실패');
}

// ===== Document Actions =====
export async function updateDocumentPermission(documentId: string, allowedRoles: string[]): Promise<DocumentResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/documents/${documentId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ allowedRoles }),
  });

  if (!response.ok) throw new Error('문서 권한 변경 실패');
  return response.json();
}

export async function reprocessDocument(documentId: string): Promise<DocumentResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/documents/${documentId}/reprocess`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('문서 재처리 실패');
  return response.json();
}

// ===== Plan Updates =====
export async function updateOnboardingPlan(planId: string, data: any): Promise<PlanResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/onboarding-plans/${planId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('계획 수정 실패');
  return response.json();
}

export async function regenerateOnboardingPlan(planId: string): Promise<PlanResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/onboarding-plans/${planId}/regenerate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error('계획 재생성 실패');
  return response.json();
}

// ===== Template Updates =====
export async function updateTemplate(templateId: string, data: any): Promise<TemplateResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/templates/${templateId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('템플릿 수정 실패');
  return response.json();
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

export async function getAuditLogs(
  page: number = 0,
  size: number = 50,
  actorId?: string,
  eventType?: string,
  from?: string,
  to?: string
): Promise<AuditLogPageResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });

  if (actorId) params.append('actorId', actorId);
  if (eventType) params.append('eventType', eventType);
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await apiFetch(`${API_BASE}/admin/audit-logs?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('감사 로그 조회 실패');
  return response.json();
}

export async function inviteMember(email: string, role: string = 'MEMBER'): Promise<InvitationResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await apiFetch(`${API_BASE}/members/invitations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '멤버 초대 실패');
  }

  return response.json();
}

// ===== Auth =====
export interface SignupRequest {
  email: string;
  name: string;
  password: string;
}

export interface SignupResponse {
  email: string;
  success: boolean;
  message?: string;
}

export async function signup(request: SignupRequest): Promise<SignupResponse> {
  const response = await apiFetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: request.email.trim().toLowerCase(),
      name: request.name,
      password: request.password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '회원가입 실패');
  }

  return response.json();
}

// ===== Email Verification =====
export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  email: string;
  success: boolean;
}

export interface ResendVerificationResponse {
  success: boolean;
  message?: string;
}

export async function verifyEmail(email: string, code: string): Promise<VerifyEmailResponse> {
  const response = await apiFetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '이메일 인증 실패');
  }

  return response.json();
}

export async function resendVerificationCode(email: string): Promise<ResendVerificationResponse> {
  const response = await apiFetch(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '코드 재전송 실패');
  }

  return response.json();
}
