'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import { updateMember, type MembershipStatus, type WorkspaceRole } from '@/lib/api';

/** 서버가 허용하는 역할. OWNER 는 이관 절차가 따로 있어 여기서 빼 둔다 */
const ROLE_OPTIONS: WorkspaceRole[] = ['ADMIN', 'MANAGER', 'MEMBER', 'NEW_HIRE'];
const STATUS_OPTIONS: MembershipStatus[] = ['ACTIVE', 'DISABLED'];

function MemberRoleAssignmentContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('id');

  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('MEMBER');
  const [selectedStatus, setSelectedStatus] = useState<MembershipStatus>('ACTIVE');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangeRole = async () => {
    if (!memberId) {
      showToast('구성원 ID가 없습니다. 구성원 목록에서 다시 시도해 주세요.', 'error');
      return;
    }
    try {
      setIsLoading(true);
      await updateMember(memberId, { role: selectedRole, status: selectedStatus });
      showToast('구성원 정보를 변경했습니다.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '변경에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>구성원 역할 · 상태 변경</h1>

      <label style={{ display: 'block', marginBottom: '8px' }}>역할</label>
      <select
        value={selectedRole}
        onChange={e => setSelectedRole(e.target.value as WorkspaceRole)}
        style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}
      >
        {ROLE_OPTIONS.map(role => (
          <option key={role} value={role}>{getDisplayLabel(role)}</option>
        ))}
      </select>

      <label style={{ display: 'block', marginBottom: '8px' }}>상태</label>
      <select
        value={selectedStatus}
        onChange={e => setSelectedStatus(e.target.value as MembershipStatus)}
        style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}
      >
        {STATUS_OPTIONS.map(status => (
          <option key={status} value={status}>{getDisplayLabel(status)}</option>
        ))}
      </select>

      <button
        onClick={() => void handleChangeRole()}
        disabled={isLoading}
        style={{ padding: '12px', backgroundColor: '#0765FC', color: 'white', borderRadius: '8px' }}
      >
        {isLoading ? '변경 중...' : '변경 저장'}
      </button>

      <p style={{ marginTop: '20px', fontSize: '13px', color: '#6b7280' }}>
        소유자(OWNER) 역할은 서버에서 변경을 막고 있습니다.
      </p>
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
