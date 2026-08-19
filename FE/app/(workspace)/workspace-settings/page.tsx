'use client';

import React, { useState } from 'react';
import { Settings, Save, Trash2 } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { useToast } from '@/components/ui/toast';
import { getWorkspaceId } from '@/lib/storage';
import { updateWorkspace } from '@/lib/api';

export default function WorkspaceSettingsPage() {
  const { showToast } = useToast();
  const [workspaceName, setWorkspaceName] = useState('마케팅팀 인수인계');
  const [workspaceDesc, setWorkspaceDesc] = useState('마케팅팀 신규 입사자 온보딩 및 업무 인수인계 워크스페이스');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!workspaceName.trim()) {
      showToast('Workspace 이름을 입력해주세요', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const wsId = getWorkspaceId();
      if (!wsId) throw new Error('Workspace ID 없음');
      await updateWorkspace(wsId, workspaceName);
      showToast('워크스페이스 설정이 저장되었습니다.', 'success');
    } catch (err: any) {
      showToast(err.message || '저장 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      <CommonSidebar />

      <main style={{ flex: 1, padding: '32px 40px', maxWidth: '900px' }}>
        <header style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>워크스페이스 설정</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            워크스페이스 기본 정보 및 정책을 관리합니다.
          </p>
        </header>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="#4F46E5" /> 기본 정보
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              워크스페이스 이름
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="워크스페이스 이름"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              설명
            </label>
            <textarea
              value={workspaceDesc}
              onChange={(e) => setWorkspaceDesc(e.target.value)}
              placeholder="워크스페이스에 대한 설명"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Save size={16} />
            {isLoading ? '저장 중...' : '변경 내용 저장'}
          </button>
        </div>

        {/* Security / Danger Zone */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #FEE2E2', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#DC2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={18} color="#DC2626" /> 위험 구역
          </h2>
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
            워크스페이스를 삭제하면 모든 온보딩 계획, 체크리스트, 업로드된 문서가 영구적으로 삭제됩니다.
          </p>
          <button
            onClick={() => showToast('워크스페이스 삭제는 관리자 승인이 필요합니다.', 'error')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            워크스페이스 삭제
          </button>
        </div>
      </main>
    </div>
  );
}
