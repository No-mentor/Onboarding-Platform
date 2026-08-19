const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';
const USER_EMAIL_KEY = 'user_email';
const USER_NAME_KEY = 'user_name';
const WORKSPACE_ID_KEY = 'workspace_id';

/** 로그인 상태 변경을 같은 탭의 구독자에게 알리는 이벤트 */
export const AUTH_CHANGE_EVENT = 'onboardos:auth-change';

/** 스냅샷 직렬화 구분자 (이름/이메일에 들어갈 수 없는 문자) */
const SNAPSHOT_SEP = '\n';

/**
 * 인증 토큰을 localStorage에 저장
 */
export function saveAuthToken(
  token: string,
  userId: string,
  email: string,
  name?: string,
  workspaceId?: string
): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(USER_EMAIL_KEY, email);
  if (name) {
    localStorage.setItem(USER_NAME_KEY, name);
  }
  if (workspaceId) {
    localStorage.setItem(WORKSPACE_ID_KEY, workspaceId);
  }
  notifyAuthChange();
}

/**
 * 같은 탭에서 일어난 로그인/로그아웃을 알린다.
 * (storage 이벤트는 다른 탭에서만 발생하므로 직접 쏴 준다)
 */
export function notifyAuthChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
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

/**
 * localStorage에서 워크스페이스 ID 조회
 */
export function getWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(WORKSPACE_ID_KEY);
}

/**
 * localStorage에서 모든 인증 정보 삭제
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(WORKSPACE_ID_KEY);
  notifyAuthChange();
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
  if (typeof window === 'undefined') return null;

  // 로그인 응답으로 받은 실제 이름이 있으면 그대로 쓴다
  const stored = localStorage.getItem(USER_NAME_KEY);
  if (stored) return stored;

  const email = getUserEmail();
  if (!email) return null;

  const namepart = email.split('@')[0];
  return namepart
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * useSyncExternalStore 용 스냅샷.
 * 값이 같으면 같은 문자열이 나오도록 한 줄로 직렬화한다. 로그아웃 상태는 빈 문자열.
 */
export function getAuthSnapshot(): string {
  if (typeof window === 'undefined') return '';

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return '';

  return [getUserName() ?? '', getUserEmail() ?? ''].join(SNAPSHOT_SEP);
}

/** getAuthSnapshot 문자열을 되돌린다 */
export function parseAuthSnapshot(snapshot: string): { name: string; email: string } | null {
  if (!snapshot) return null;
  const [name, email] = snapshot.split(SNAPSHOT_SEP);
  return { name: name || email || '사용자', email: email ?? '' };
}
