'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast';

export default function MemberRoleAssignmentPage() {
  const { showToast } = useToast();
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangeRole = async () => {
    try {
      setIsLoading(true);
      // 실제 API 호출은 여기에 구현
      showToast('역할이 변경되었습니다', 'success');
    } catch (err) {
      showToast('역할 변경 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>멤버 역할 설정</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>역할 선택</label>
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb' }}
          >
            <option value="MEMBER">멤버</option>
            <option value="ADMIN">관리자</option>
            <option value="OWNER">소유자</option>
          </select>
        </div>
        <button
          onClick={handleChangeRole}
          disabled={isLoading}
          style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white', borderRadius: '8px' }}
        >
          {isLoading ? '변경 중...' : '역할 변경'}
        </button>
      </div>
    </div>
  );
}
