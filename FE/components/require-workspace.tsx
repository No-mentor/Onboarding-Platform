'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, type MeResponse, type MeWorkspace } from '@/lib/auth';
import {
  clearWorkspaceId,
  getAuthToken,
  getWorkspaceId,
  saveWorkspaceId,
} from '@/lib/storage';

type WorkspaceStatus =
  /** 확인 중 (리다이렉트 대기 포함) */
  | 'checking'
  /** 로그인은 했지만 소속 워크스페이스가 하나도 없음 */
  | 'empty'
  /** 정상 */
  | 'ready';

const MeContext = createContext<MeResponse | null>(null);

/**
 * RequireWorkspace 가 이미 받아 온 /auth/me 결과를 그대로 쓴다.
 * 화면마다 같은 요청을 다시 보내지 않기 위한 것이라, 가드 밖에서 부르면 null 이다.
 */
export function useMe(): MeResponse | null {
  return useContext(MeContext);
}

/** 현재 선택된 워크스페이스 (이름/역할 표시에 쓴다) */
export function useCurrentWorkspace(): MeWorkspace | null {
  return useMe()?.currentWorkspace ?? null;
}

interface RequireWorkspaceProps {
  children: React.ReactNode;
  /**
   * 워크스페이스가 하나도 없을 때 리다이렉트 대신 보여줄 화면.
   * 주지 않으면 워크스페이스 생성 페이지로 보낸다.
   */
  emptyState?: React.ReactNode;
}

/**
 * 워크스페이스가 필요한 화면을 감싼다.
 *
 * 서버는 X-Workspace-Id 가 없으면 500, 소속되지 않은 워크스페이스면 403(WORKSPACE_MISMATCH)을
 * 반환한다. 화면마다 이 에러를 처리하는 대신 진입 시점에 한 번 정리한다.
 */
export function RequireWorkspace({ children, emptyState }: RequireWorkspaceProps) {
  const router = useRouter();
  const [status, setStatus] = useState<WorkspaceStatus>('checking');
  const [me, setMe] = useState<MeResponse | null>(null);
  // emptyState 는 매 렌더마다 새 엘리먼트라 의존성에 그대로 넣으면 검사가 반복된다.
  // 검사 로직에는 "있는지 없는지"만 필요하다.
  const hasEmptyState = emptyState !== undefined;

  const check = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const stored = getWorkspaceId();
      const me = await fetchMe(token, stored);
      setMe(me);
      const workspaces = me.workspaces ?? [];

      if (workspaces.length === 0) {
        // 남아 있던 워크스페이스가 있다면 더 이상 유효하지 않다
        clearWorkspaceId();
        setStatus('empty');
        if (!hasEmptyState) {
          router.replace('/workspace-create');
        }
        return;
      }

      const isValid = stored !== null && workspaces.some(w => w.id === stored);

      if (isValid) {
        setStatus('ready');
        return;
      }

      // 저장된 값이 없거나 이미 권한이 사라진 워크스페이스를 가리키고 있다
      if (workspaces.length === 1) {
        // 고를 것이 하나뿐이면 굳이 물어보지 않는다
        saveWorkspaceId(workspaces[0].id);
        // 헤더 없이 물어봤다면 currentWorkspace 가 비어 있을 수 있어 채워 준다
        setMe({ ...me, currentWorkspace: me.currentWorkspace ?? workspaces[0] });
        setStatus('ready');
        return;
      }

      clearWorkspaceId();
      router.replace('/workspace-selection');
    } catch {
      // 토큰 만료 등 - 다시 로그인시킨다
      router.replace('/login');
    }
  }, [router, hasEmptyState]);

  useEffect(() => {
    // 진입 시 1회 서버에 상태를 물어보는 데이터 페칭 effect 다.
    // 결과가 도착한 뒤(=await 이후) setState 하므로 cascading render 는 발생하지 않는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
  }, [check]);

  if (status === 'ready') {
    return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
  }

  if (status === 'empty' && emptyState) {
    return <>{emptyState}</>;
  }

  // checking / 리다이렉트 대기 중
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-faint)',
        fontSize: '13.5px',
      }}
    >
      불러오는 중...
    </div>
  );
}
