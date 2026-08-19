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
      showToast('워크스페이스 이름을 입력해주세요', 'error');
      return;
    }
    try {
      setIsLoading(true);
      await createWorkspace(name);
      showToast('워크스페이스가 생성되었습니다', 'success');
      window.location.href = '/dashboard';
    } catch (err) {
      showToast('워크스페이스 생성에 실패했습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>워크스페이스 생성</h1>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="워크스페이스 이름"
        style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}
      />
      <button
        onClick={handleCreate}
        disabled={isLoading}
        style={{ padding: '12px', backgroundColor: '#0765FC', color: 'white', borderRadius: '8px' }}
      >
        생성
      </button>
    </div>
  );
}
