import { RequireWorkspace } from '@/components/require-workspace';

/**
 * 워크스페이스가 있어야 의미가 있는 화면들의 공통 레이아웃.
 * (workspace) 는 라우트 그룹이라 URL 에는 영향을 주지 않는다.
 *
 * 대시보드는 리다이렉트 대신 빈 상태 화면을 보여줘야 해서 이 그룹에 넣지 않고
 * 페이지에서 직접 RequireWorkspace 를 emptyState 와 함께 사용한다.
 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <RequireWorkspace>{children}</RequireWorkspace>;
}
