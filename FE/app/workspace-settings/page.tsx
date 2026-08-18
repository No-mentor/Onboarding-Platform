'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast';

export default function WorkspaceSettingsPage() {
  const { showToast } = useToast();
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
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
      <input type="text" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="Workspace 이름" style={{ width: '100%', padding: '8px', marginBottom: '16px' }} />
      <button onClick={handleSave} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white' }}>저장</button>
    </div>
  );
}
