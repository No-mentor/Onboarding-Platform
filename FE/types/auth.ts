/**
 * 워크스페이스에서의 역할 (서버 UserRole 과 1:1)
 */
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'NEW_HIRE';

/**
 * 워크스페이스 요약 정보 (서버 WorkspaceSummaryResponse 와 1:1)
 */
export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
}

/**
 * 로그인 응답 (서버 AuthResponse 와 1:1)
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
