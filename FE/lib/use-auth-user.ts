'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { AUTH_CHANGE_EVENT, getAuthSnapshot, parseAuthSnapshot } from './storage';

export interface AuthUser {
  name: string;
  email: string;
}

function subscribe(callback: () => void): () => void {
  // storage: 다른 탭에서의 변경 / AUTH_CHANGE_EVENT: 같은 탭에서의 변경
  window.addEventListener('storage', callback);
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
  };
}

// 서버 렌더링 시점에는 localStorage 를 볼 수 없으므로 로그아웃 상태로 그린다.
// 하이드레이션 직후 클라이언트 스냅샷으로 교체되어 마크업 불일치가 나지 않는다.
function getServerSnapshot(): string {
  return '';
}

/**
 * 현재 로그인한 사용자. 로그아웃 상태면 null.
 * 로그인/로그아웃이 일어나면 구독 중인 컴포넌트가 알아서 다시 그려진다.
 */
export function useAuthUser(): AuthUser | null {
  const snapshot = useSyncExternalStore(subscribe, getAuthSnapshot, getServerSnapshot);
  return useMemo(() => parseAuthSnapshot(snapshot), [snapshot]);
}
