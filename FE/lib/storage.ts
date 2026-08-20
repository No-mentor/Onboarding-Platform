const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';
const USER_EMAIL_KEY = 'user_email';
const USER_NAME_KEY = 'user_name';
const WORKSPACE_ID_KEY = 'workspace_id';

/** 로그인 상태 변경을 같은 탭의 구독자에게 알리는 이벤트 */
export const AUTH_CHANGE_EVENT = 'onboardos:auth-change';

/** 스냅샷 직렬화 구분자 (이름/이메일에 들어갈 수 없는 문자) */
const SNAPSHOT_SEP = '\n';

const AUTH_KEYS = [TOKEN_KEY, USER_ID_KEY, USER_EMAIL_KEY, USER_NAME_KEY, WORKSPACE_ID_KEY];

/**
 * '로그인 상태 유지'를 켜면 localStorage(브라우저를 닫아도 유지),
 * 끄면 sessionStorage(탭을 닫으면 사라짐)에 저장한다.
 */
function store(remember: boolean): Storage {
  return remember ? localStorage : sessionStorage;
}

/** 두 저장소를 모두 보고 값을 찾는다 (어느 쪽에 로그인했는지 몰라도 되도록) */
function readValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

/** 값이 들어 있는 저장소에만 쓴다. 없으면 localStorage 를 기본으로 한다 */
function writeValue(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  const target = sessionStorage.getItem(TOKEN_KEY) !== null ? sessionStorage : localStorage;
  target.setItem(key, value);
}

function removeValue(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

/**
 * 인증 정보를 저장한다.
 * @param remember false 면 이 탭에서만 유지된다 (로그인 화면의 '로그인 상태 유지' 체크박스)
 */
export function saveAuthToken(
  token: string,
  userId: string,
  email: string,
  name?: string,
  workspaceId?: string,
  remember: boolean = true
): void {
  if (typeof window === 'undefined') return;

  // 이전 로그인이 다른 저장소에 남아 있으면 지운다
  for (const key of AUTH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  const target = store(remember);
  target.setItem(TOKEN_KEY, token);
  target.setItem(USER_ID_KEY, userId);
  target.setItem(USER_EMAIL_KEY, email);
  if (name) {
    target.setItem(USER_NAME_KEY, name);
  }
  // 워크스페이스가 없는 계정으로 로그인하면 이전 세션의 값이 남지 않도록 지운다
  if (workspaceId) {
    target.setItem(WORKSPACE_ID_KEY, workspaceId);
  }
  notifyAuthChange();
}

/**
 * 현재 워크스페이스를 저장한다.
 * 워크스페이스 선택/생성 후에는 반드시 이 함수를 쓴다. (키를 직접 다루지 말 것)
 */
export function saveWorkspaceId(workspaceId: string): void {
  writeValue(WORKSPACE_ID_KEY, workspaceId);
  notifyAuthChange();
}

/** 저장된 워크스페이스를 지운다 (권한이 사라졌거나 선택 전 상태) */
export function clearWorkspaceId(): void {
  removeValue(WORKSPACE_ID_KEY);
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
 * 저장된 인증 토큰 조회
 */
export function getAuthToken(): string | null {
  return readValue(TOKEN_KEY);
}

/**
 * 저장된 사용자 ID 조회
 */
export function getUserId(): string | null {
  return readValue(USER_ID_KEY);
}

/**
 * 저장된 사용자 이메일 조회
 */
export function getUserEmail(): string | null {
  return readValue(USER_EMAIL_KEY);
}

/**
 * 저장된 워크스페이스 ID 조회
 */
export function getWorkspaceId(): string | null {
  return readValue(WORKSPACE_ID_KEY);
}

/**
 * 두 저장소의 인증 정보를 모두 삭제
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;

  for (const key of AUTH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  notifyAuthChange();
}

/**
 * 현재 로그인 상태 확인
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * 화면에 보여줄 사용자 이름.
 * 로그인 응답으로 받은 실제 이름이 있으면 그대로 쓰고, 없으면 이메일에서 만든다.
 */
export function getUserName(): string | null {
  if (typeof window === 'undefined') return null;

  const stored = readValue(USER_NAME_KEY);
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

  const token = readValue(TOKEN_KEY);
  if (!token) return '';

  return [getUserName() ?? '', getUserEmail() ?? ''].join(SNAPSHOT_SEP);
}

/** getAuthSnapshot 문자열을 되돌린다 */
export function parseAuthSnapshot(snapshot: string): { name: string; email: string } | null {
  if (!snapshot) return null;
  const [name, email] = snapshot.split(SNAPSHOT_SEP);
  return { name: name || email || '사용자', email: email ?? '' };
}
