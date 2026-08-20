'use client';

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import { getOnboardingPlan, regenerateOnboardingPlan, type PlanResponse } from '@/lib/api';

function PlanEditContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [keepCompleted, setKeepCompleted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setPlan(await getOnboardingPlan(false));
    } catch {
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // 쿼리로 계획 ID 를 넘겨받을 수도 있고, 없으면 내 계획을 쓴다
  const planId = searchParams.get('id') ?? plan?.planId ?? null;

  const handleRegenerate = async () => {
    if (!planId) {
      showToast('재생성할 계획이 없습니다. 먼저 계획을 만들어 주세요.', 'error');
      return;
    }
    try {
      setIsSaving(true);
      await regenerateOnboardingPlan(planId, keepCompleted);
      showToast('계획을 다시 생성했습니다.', 'success');
      router.push('/30day-plan');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '계획 재생성에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>계획 재생성</h1>

      {isLoading ? (
        <p>불러오는 중...</p>
      ) : plan ? (
        <div style={{ fontSize: '14px', lineHeight: 1.9, marginBottom: '20px' }}>
          <div>상태 · {getDisplayLabel(plan.status)}</div>
          <div>기간 · {plan.startDate} ~ {plan.endDate}</div>
          <div>항목 수 · {plan.itemCount}개</div>
          <div>진행률 · {Math.round(Number(plan.progressPercent ?? 0))}%</div>
        </div>
      ) : (
        <p style={{ marginBottom: '20px' }}>아직 계획이 없습니다. 30일 계획 화면에서 먼저 만들어 주세요.</p>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px' }}>
        <input
          type="checkbox"
          checked={keepCompleted}
          onChange={e => setKeepCompleted(e.target.checked)}
        />
        이미 완료한 항목은 그대로 유지하기
      </label>

      <button
        onClick={() => void handleRegenerate()}
        disabled={isSaving || !planId}
        style={{ padding: '12px', backgroundColor: '#0765FC', color: 'white', borderRadius: '8px' }}
      >
        {isSaving ? '재생성 중...' : '계획 재생성'}
      </button>

      <p style={{ marginTop: '20px', fontSize: '13px', color: '#6b7280', lineHeight: 1.7 }}>
        서버에는 계획 이름/설명을 고치는 API가 없어, 계획 변경은 재생성으로만 할 수 있습니다.
      </p>
    </div>
  );
}

export default function PlanEditPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>로딩 중...</div>}>
      <PlanEditContent />
    </Suspense>
  );
}
