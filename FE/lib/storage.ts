const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';
const USER_EMAIL_KEY = 'user_email';
const WORKSPACE_ID_KEY = 'workspace_id';

/**
 * 인증 토큰을 localStorage에 저장
 */
export function saveAuthToken(token: string, userId: string, email: string, workspaceId?: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(USER_EMAIL_KEY, email);
  if (workspaceId) {
    localStorage.setItem(WORKSPACE_ID_KEY, workspaceId);
  }
}

/**
 * localStorage에서 인증 토큰 조회
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(TOKEN_KEY);
}

/**
 * localStorage에서 사용자 ID 조회
 */
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(USER_ID_KEY);
}

/**
 * localStorage에서 사용자 이메일 조회
 */
export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(USER_EMAIL_KEY);
}

export function saveWorkspaceId(workspaceId: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(WORKSPACE_ID_KEY, workspaceId);
  localStorage.setItem('workspaceId', workspaceId);
}

export const setWorkspaceId = saveWorkspaceId;

/**
 * localStorage에서 워크스페이스 ID 조회
 */
export function getWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(WORKSPACE_ID_KEY) || localStorage.getItem('workspaceId');
}

/**
 * localStorage에서 모든 인증 정보 삭제
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(WORKSPACE_ID_KEY);
}

/**
 * 현재 로그인 상태 확인
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * 이메일에서 사용자 이름 파싱
 * "sewon.kim@company.com" → "Sewon Kim"
 */
export function getUserName(): string | null {
  const email = getUserEmail();
  if (!email) return null;

  const namepart = email.split('@')[0];
  return namepart
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
