const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';
const USER_EMAIL_KEY = 'user_email';

/**
 * 인증 토큰을 localStorage에 저장
 */
export function saveAuthToken(token: string, userId: string, email: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(USER_EMAIL_KEY, email);
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
 * localStorage에서 모든 인증 정보 삭제
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

/**
 * 현재 로그인 상태 확인
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}
