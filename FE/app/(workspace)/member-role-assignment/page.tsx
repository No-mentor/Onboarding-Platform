'use client';
import React, { useState, Suspense } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';
import { updateMemberRole } from '@/lib/api';

function MemberRoleAssignmentContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangeRole = async () => {
    try {
      setIsLoading(true);
      const memberId = searchParams.get('id') || '';
      await updateMemberRole(memberId, selectedRole);
      showToast('역할이 변경되었습니다', 'success');
    } catch (err) {
      showToast('역할 변경 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>멤버 역할 설정</h1>
      <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
        <option value="MEMBER">멤버</option>
        <option value="ADMIN">관리자</option>
        <option value="OWNER">소유자</option>
      </select>
      <button onClick={handleChangeRole} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white', borderRadius: '8px' }}>
        {isLoading ? '변경 중...' : '역할 변경'}
      </button>
    </div>
  );
}

export default function MemberRoleAssignmentPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>로딩 중...</div>}>
      <MemberRoleAssignmentContent />
    </Suspense>
  );
}
