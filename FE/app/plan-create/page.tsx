'use client';
import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { generateOnboardingPlan } from '@/lib/api';

export default function PlanCreatePage() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    try {
      setIsLoading(true);
      await generateOnboardingPlan();
      showToast('계획이 생성되었습니다', 'success');
    } catch (err) {
      showToast('계획 생성 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>계획 생성</h1>
      <button onClick={handleCreate} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white' }}>
        {isLoading ? '생성 중...' : '계획 생성'}
      </button>
    </div>
  );
}