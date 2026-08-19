'use client';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { getMembers, type MemberResponse } from '@/lib/api';

export default function MemberDetailPage() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMembers();
        setMembers(res.items ?? []);
      } catch (err) {
        showToast('멤버 정보를 불러올 수 없습니다', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: '40px' }}>
      <h1>멤버 상세 정보</h1>
      {isLoading ? <p>로딩 중...</p> : <pre>{JSON.stringify(members, null, 2)}</pre>}
    </div>
  );
}