'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { getMyWorkspaces } from '@/lib/api';
import styles from './workspace-selection.module.css';

export default function WorkspaceSelectionPage() {
  const { showToast } = useToast();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setIsLoading(true);
        const response = await getMyWorkspaces();
        setWorkspaces(response.workspaces || []);
      } catch (err) {
        console.error('Workspace 로드 실패:', err);
        showToast('Workspace를 불러올 수 없습니다', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadWorkspaces();
  }, []);

  const handleSelectWorkspace = (workspaceId: string) => {
    localStorage.setItem('workspaceId', workspaceId);
    showToast('Workspace가 변경되었습니다', 'success');
    window.location.href = '/dashboard';
  };

  return (
    <div style={{ padding: '40px' }}>
      <h1>Workspace 선택</h1>
      {isLoading ? (
        <p>로딩 중...</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {workspaces.map(ws => (
            <div
              key={ws.id}
              style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onClick={() => handleSelectWorkspace(ws.id)}
            >
              <div>
                <div style={{ fontWeight: '600' }}>{ws.name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{ws.memberCount} 명</div>
              </div>
              <ChevronRight size={20} />
            </div>
          ))}
          <button style={{ padding: '16px', textAlign: 'left' }}>
            <Plus size={20} /> 새 Workspace 만들기
          </button>
        </div>
      )}
    </div>
  );
}
