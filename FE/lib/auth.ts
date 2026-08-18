import { AuthResponse } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const AUTH_ENDPOINT = `${API_BASE_URL}/api/v1/auth`;

export interface SignupPayload {
  email: string;
  password: string;
  name: string;
}

export interface SignupResponse {
  email: string;
  message: string;
  emailSent: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * 회원가입 API 호출
 * 토큰을 즉시 발급하지 않고, email_verified=false 상태로 계정 생성 후 인증 코드 발송
 * @throws {AuthError} API 에러 발생 시
 */
export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  const response = await fetch(`${AUTH_ENDPOINT}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new AuthError(
      response.status,
      errorData.message || getErrorMessage(response.status),
      errorData.code
    );
  }

  return response.json();
}

/**
 * 로그인 API 호출
 * @throws {AuthError} API 에러 발생 시
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${AUTH_ENDPOINT}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new AuthError(
      response.status,
      errorData.message || getErrorMessage(response.status),
      errorData.code
    );
  }

  return response.json();
}

/**
 * 현재 사용자 정보 조회
 * @throws {AuthError} 인증 실패 또는 API 에러
 */
export async function fetchMe(token: string): Promise<any> {
  const response = await fetch(`${AUTH_ENDPOINT}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new AuthError(response.status, getErrorMessage(response.status));
  }

  return response.json();
}

/**
 * 로그아웃 API 호출 (선택적)
 */
export async function logout(token: string): Promise<void> {
  await fetch(`${AUTH_ENDPOINT}/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * 상태 코드별 에러 메시지
 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return '요청 형식이 올바르지 않습니다.';
    case 401:
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 403:
      return '비활성화된 계정입니다.';
    case 409:
      return '이미 가입된 이메일입니다.';
    case 500:
      return '서버 오류가 발생했습니다. 나중에 다시 시도해주세요.';
    default:
      return '요청 처리 중 오류가 발생했습니다.';
  }
}

/**
 * 인증 API 에러 클래스
 */
export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }

  /**
   * 사용자 입력 검증 실패 여부
   */
  isValidationError(): boolean {
    return this.status === 400;
  }

  /**
   * 인증 실패 여부
   */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * 권한 부족 여부
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * 리소스 충돌 여부
   */
  isConflict(): boolean {
    return this.status === 409;
  }
}
