'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { createWorkspace } from '@/lib/api';

export default function WorkspaceCreatePage() {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name) {
      showToast('Workspace 이름을 입력해주세요', 'error');
      return;
    }
    try {
      setIsLoading(true);
      await createWorkspace(name);
      showToast('Workspace가 생성되었습니다', 'success');
      window.location.href = '/dashboard';
    } catch (err) {
      showToast('Workspace 생성 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Workspace 생성</h1>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Workspace 이름"
        style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}
      />
      <button
        onClick={handleCreate}
        disabled={isLoading}
        style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white', borderRadius: '8px' }}
      >
        생성
      </button>
    </div>
  );
}
