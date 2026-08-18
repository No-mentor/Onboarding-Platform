'use client';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { getMembers } from '@/lib/api';

export default function MemberDetailPage() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMembers();
        setMembers(res.content || []);
      } catch { showToast('로드 실패', 'error'); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  return <div style={{ padding: '40px' }}><h1>멤버 상세</h1>{isLoading ? 'Loading...' : <pre>{JSON.stringify(members, null, 2)}</pre>}</div>;
}
