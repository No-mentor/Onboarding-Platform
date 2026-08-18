'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';

function RecommendationDetailContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // API 호출
      } catch (err) {
        showToast('추천을 불러올 수 없습니다', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: '40px' }}>
      <h1>추천 상세</h1>
      {isLoading ? <p>로딩 중...</p> : <p>추천 정보</p>}
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