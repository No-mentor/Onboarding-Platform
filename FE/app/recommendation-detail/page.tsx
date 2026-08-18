'use client';
import React, { useState, Suspense } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';
import { dismissRecommendation } from '@/lib/api';

function RecommendationDetailContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const handleDismiss = async () => {
    try {
      setIsLoading(true);
      const recId = searchParams.get('id') || '';
      await dismissRecommendation(recId);
      showToast('추천이 숨겨졌습니다', 'success');
    } catch (err) {
      showToast('숨김 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px' }}>
      <h1>추천 상세</h1>
      <button onClick={handleDismiss} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px' }}>
        {isLoading ? '처리 중...' : '추천 숨기기'}
      </button>
    </div>
  );
}

export default function RecommendationDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>로딩 중...</div>}>
      <RecommendationDetailContent />
    </Suspense>
  );
}