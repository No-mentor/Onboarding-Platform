'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { getWorkspaceId } from '@/lib/storage';
import { updateWorkspace } from '@/lib/api';

export default function WorkspaceSettingsPage() {
  const { showToast } = useToast();
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!workspaceName) {
      showToast('Workspace 이름을 입력해주세요', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const wsId = getWorkspaceId();
      if (!wsId) throw new Error('Workspace ID 없음');
      await updateWorkspace(wsId, workspaceName);
      showToast('설정이 저장되었습니다', 'success');
    } catch (err) {
      showToast('저장 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>Workspace 설정</h1>
      <input
        type="text"
        value={workspaceName}
        onChange={e => setWorkspaceName(e.target.value)}
        placeholder="Workspace 이름"
        style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}
      />
      <button
        onClick={handleSave}
        disabled={isLoading}
        style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
      >
        {isLoading ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}
