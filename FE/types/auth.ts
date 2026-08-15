/**
 * 워크스페이스 요약 정보
 */
export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'INTERN' | 'NEW_HIRE';
}

/**
 * 인증 응답 (회원가입/로그인)
 */
export interface AuthResponse {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  workspaces: WorkspaceSummary[];
}

/**
 * 현재 사용자 정보 응답
 */
export interface MeResponse {
  userId: string;
  email: string;
  name: string;
  current?: WorkspaceSummary;
  profile?: {
    department: string;
    careerLevel: string;
    title: string;
  };
  workspaces: WorkspaceSummary[];
}
