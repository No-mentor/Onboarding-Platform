import { getAuthToken, getWorkspaceId } from './storage';

const API_BASE = 'http://localhost:8080/api/v1';

// ===== Dashboard =====
export interface DashboardResponse {
  today: Array<{ id: string; title: string; label: string; time: string }>;
  progress: { completed: number; total: number };
  plan: { currentDay: number; totalDays: number };
}

export async function getDashboard(): Promise<DashboardResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await fetch(`${API_BASE}/dashboard/me`, {
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

  const response = await fetch(`${API_BASE}/recommendations/today`, {
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

  const response = await fetch(`${API_BASE}/recommendations/${recommendationId}/complete`, {
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

  const response = await fetch(`${API_BASE}/onboarding-plans/me?includeItems=${includeItems}`, {
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

  const response = await fetch(`${API_BASE}/onboarding-plans/generate`, {
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

  const response = await fetch(`${API_BASE}/checklists/me?status=ALL`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('체크리스트 조회 실패');
  return response.json();
}

// ===== Progress =====
export interface AdminProgressItemResponse {
  id: string;
  name: string;
  team: string;
  day: number;
  progress: number;
  completed: number;
  total: number;
  status: string;
  activity?: string;
}

export interface AdminProgressListResponse {
  content: AdminProgressItemResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export async function getAdminProgress(page: number = 0, size: number = 20): Promise<AdminProgressListResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const params = new URLSearchParams({ page: page.toString(), size: size.toString() });

  const response = await fetch(`${API_BASE}/admin/progress?${params}`, {
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

export interface SendMessageResponse {
  id: string;
  sessionId: string;
  content: string;
  citations?: Array<{ name: string; type?: string }>;
}

export async function getChatSessions(): Promise<{ items: ChatSessionSummaryResponse[] }> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await fetch(`${API_BASE}/chat/sessions`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('채팅 세션 조회 실패');
  return response.json();
}

export async function getChatSessionDetail(sessionId: string): Promise<ChatSessionDetailResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
    },
  });

  if (!response.ok) throw new Error('세션 상세 조회 실패');
  return response.json();
}

export async function sendChatMessage(message: string, sessionId?: string): Promise<SendMessageResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await fetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': wsId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!response.ok) throw new Error('메시지 전송 실패');
  return response.json();
}

// ===== Members =====
export interface MemberResponse {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: string;
  joinedAt?: string;
}

export interface MemberListResponse {
  content: MemberResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export async function getMembers(page: number = 0, size: number = 20): Promise<MemberListResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const params = new URLSearchParams({ page: page.toString(), size: size.toString() });

  const response = await fetch(`${API_BASE}/members?${params}`, {
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
export interface DocumentResponse {
  id: string;
  title?: string;
  fileName?: string;
  status?: string;
  size?: string;
  createdAt?: string;
}

export async function uploadDocument(formData: FormData): Promise<DocumentResponse> {
  const token = getAuthToken();
  const wsId = getWorkspaceId();
  if (!token || !wsId) throw new Error('인증 정보 없음');

  const response = await fetch(`${API_BASE}/documents`, {
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

  const response = await fetch(`${API_BASE}/documents/${documentId}`, {
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
  memberCount?: number;
  createdAt?: string;
}

export interface WorkspaceListResponse {
  workspaces: WorkspaceResponse[];
}

export async function getMyWorkspaces(): Promise<WorkspaceListResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 정보 없음');

  const response = await fetch(`${API_BASE}/workspaces/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error('Workspace 목록 조회 실패');
  return response.json();
}

export async function createWorkspace(name: string): Promise<WorkspaceResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 정보 없음');

  const response = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) throw new Error('Workspace 생성 실패');
  return response.json();
}

export async function updateWorkspace(workspaceId: string, name: string): Promise<WorkspaceResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 정보 없음');

  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
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

  const response = await fetch(`${API_BASE}/templates`, {
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

  const response = await fetch(`${API_BASE}/templates`, {
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

  const response = await fetch(`${API_BASE}/templates/${templateId}`, {
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

  const response = await fetch(`${API_BASE}/members/${memberId}`, {
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
  const response = await fetch(`${API_BASE}/members/invitations/${token}/accept`, {
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

  const response = await fetch(`${API_BASE}/recommendations/${recommendationId}/dismiss`, {
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

  const response = await fetch(`${API_BASE}/documents/${documentId}`, {
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

  const response = await fetch(`${API_BASE}/documents/${documentId}/reprocess`, {
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

  const response = await fetch(`${API_BASE}/onboarding-plans/${planId}`, {
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

  const response = await fetch(`${API_BASE}/onboarding-plans/${planId}/regenerate`, {
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

  const response = await fetch(`${API_BASE}/templates/${templateId}`, {
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
export interface AuditLogResponse {
  id: string;
  timestamp: string;
  actorId: string;
  actorName?: string;
  eventType: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  result: 'ALLOW' | 'DENY';
  details?: string;
}

export interface AuditLogPageResponse {
  content: AuditLogResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

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

  const response = await fetch(`${API_BASE}/admin/audit-logs?${params}`, {
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

  const response = await fetch(`${API_BASE}/members/invitations`, {
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
