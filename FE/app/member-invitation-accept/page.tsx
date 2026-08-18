'use client';
import React, { useState, Suspense } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';

function MemberInvitationAcceptContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    try {
      setIsLoading(true);
      const token = searchParams.get('token');
      if (!token) throw new Error('초대 토큰 없음');
      showToast('초대를 수락했습니다', 'success');
    } catch (err) {
      showToast('초대 수락 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>멤버 초대 수락</h1>
      <button onClick={handleAccept} disabled={isLoading} style={{ padding: '12px 24px', backgroundColor: '#6366f1', color: 'white' }}>
        {isLoading ? '처리 중...' : '초대 수락'}
      </button>
    </div>
  );
}

export default function MemberInvitationAcceptPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>}>
      <MemberInvitationAcceptContent />
    </Suspense>
  );
}