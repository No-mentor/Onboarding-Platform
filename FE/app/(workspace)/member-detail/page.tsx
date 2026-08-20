'use client';

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import { getMembers, type MemberResponse } from '@/lib/api';

function MemberDetailContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('id');

  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getMembers(0, 100);
      setMembers(response.items ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '구성원 정보를 불러오지 못했습니다.', 'error');
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // 쿼리로 특정 구성원을 지목했다면 그 사람만, 아니면 전체를 보여 준다
  const visible = memberId ? members.filter(m => m.id === memberId) : members;

  return (
    <div style={{ padding: '40px', maxWidth: '760px' }}>
      <h1>구성원 상세</h1>
      {isLoading ? (
        <p>불러오는 중...</p>
      ) : visible.length === 0 ? (
        <p>구성원을 찾을 수 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
          {visible.map(member => (
            <div
              key={member.id}
              style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', fontSize: '14px', lineHeight: 1.8 }}
            >
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{member.name}</div>
              <div>{member.email}</div>
              <div>역할 · {getDisplayLabel(member.role)}</div>
              <div>상태 · {getDisplayLabel(member.status)}</div>
              <div>부서 · {member.department ?? '-'}</div>
              <div>직급 · {member.title ?? '-'}</div>
              <div>경력 · {member.careerLevel ?? '-'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MemberDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>로딩 중...</div>}>
      <MemberDetailContent />
    </Suspense>
  );
}
