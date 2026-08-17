'use client';

import { useCallback, useState } from 'react';
import { useToast } from './toast';

/**
 * 모달의 확인 버튼용 훅.
 *
 * 아직 API 가 붙지 않은 목업 단계라, 짧은 지연으로 처리 중 상태를 보여준 뒤
 * 완료 토스트를 띄우고 모달을 닫는다. API 가 연결되면 `run` 에 넘기는
 * 콜백만 실제 호출로 바꾸면 된다.
 */
export function useModalAction() {
  const { showToast } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async (
      key: string,
      message: string,
      onDone?: () => void,
      task?: () => Promise<void> | void
    ) => {
      if (pending) return;
      setPending(key);
      try {
        if (task) {
          await task();
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 450));
        }
        showToast(message, 'success');
        onDone?.();
      } catch {
        showToast('처리 중 문제가 발생했습니다. 다시 시도해 주세요.', 'error');
      } finally {
        setPending(null);
      }
    },
    [pending, showToast]
  );

  return {
    run,
    /** 해당 key 의 작업이 진행 중인지 */
    isPending: (key: string) => pending === key,
  };
}
