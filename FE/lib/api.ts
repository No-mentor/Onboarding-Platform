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
