'use client';
import React, { useState, Suspense } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';
import { updateOnboardingPlan } from '@/lib/api';

function PlanEditContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [planName, setPlanName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!planName) {
      showToast('계획 이름을 입력해주세요', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const planId = searchParams.get('id') || '';
      await updateOnboardingPlan(planId, { title: planName });
      showToast('계획이 수정되었습니다', 'success');
    } catch (err) {
      showToast('계획 수정 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>계획 수정</h1>
      <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="계획 이름" style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }} />
      <button onClick={handleSave} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white', borderRadius: '8px' }}>
        {isLoading ? '저장 중...' : '저장'}
      </button>
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