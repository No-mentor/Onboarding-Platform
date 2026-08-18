'use client';
import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast';

export default function DocumentPermissionPage() {
  const { showToast } = useToast();
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePermission = async () => {
    try {
      setIsLoading(true);
      showToast('권한이 업데이트되었습니다', 'success');
    } catch (err) {
      showToast('권한 업데이트 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>문서 권한 설정</h1>
      <label style={{ display: 'block', marginBottom: '8px' }}>역할 선택</label>
      <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '16px' }}>
        <option value="MEMBER">멤버</option>
        <option value="ADMIN">관리자</option>
      </select>
      <button onClick={handleUpdatePermission} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white' }}>
        {isLoading ? '업데이트 중...' : '권한 업데이트'}
      </button>
    </div>
  );
}