'use client';
import React, { useState, Suspense } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';
import { regenerateOnboardingPlan, generateOnboardingPlan } from '@/lib/api';

function PlanCreateContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    try {
      setIsLoading(true);
      const planId = searchParams.get('id');
      
      if (planId) {
        await regenerateOnboardingPlan(planId, { preserveCompleted: true });
        showToast('계획이 재생성되었습니다', 'success');
      } else {
        await generateOnboardingPlan();
        showToast('계획이 생성되었습니다', 'success');
      }
    } catch (err) {
      showToast('계획 생성 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>계획 생성</h1>
      <button onClick={handleCreate} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#0765FC', color: 'white', borderRadius: '8px' }}>
        {isLoading ? '생성 중...' : '계획 생성'}
      </button>
    </div>
  );
}

export default function PlanCreatePage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>로딩 중...</div>}>
      <PlanCreateContent />
    </Suspense>
  );
}
