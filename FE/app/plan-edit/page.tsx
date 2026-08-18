'use client';
import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast';

export default function PlanEditPage() {
  const { showToast } = useToast();
  const [planName, setPlanName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
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
      <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="계획 이름" style={{ width: '100%', padding: '8px', marginBottom: '16px' }} />
      <button onClick={handleSave} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white' }}>
        {isLoading ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}