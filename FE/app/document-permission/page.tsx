'use client';
import React, { useState, Suspense } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';
import { updateDocumentPermission } from '@/lib/api';

function DocumentPermissionContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [selectedRoles, setSelectedRoles] = useState(['MEMBER']);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePermission = async () => {
    try {
      setIsLoading(true);
      const docId = searchParams.get('id') || '';
      await updateDocumentPermission(docId, selectedRoles);
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
      <select value={selectedRoles[0]} onChange={e => setSelectedRoles([e.target.value])} style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
        <option value="MEMBER">멤버</option>
        <option value="ADMIN">관리자</option>
        <option value="OWNER">소유자</option>
      </select>
      <button onClick={handleUpdatePermission} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white', borderRadius: '8px' }}>
        {isLoading ? '업데이트 중...' : '권한 업데이트'}
      </button>
    </div>
  );
}

export default function DocumentPermissionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>로딩 중...</div>}>
      <DocumentPermissionContent />
    </Suspense>
  );
}
