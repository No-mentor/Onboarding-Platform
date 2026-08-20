'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import { uploadDocument, type DocumentVisibility, type WorkspaceRole } from '@/lib/api';

/** RESTRICTED 로 올릴 때 고를 수 있는 역할 */
const ROLE_OPTIONS: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'NEW_HIRE'];

export default function DocumentUploadPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<DocumentVisibility>('WORKSPACE');
  const [allowedRoles, setAllowedRoles] = useState<WorkspaceRole[]>(['MEMBER']);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      // 제목을 비워 두면 파일 이름을 그대로 쓴다
      if (!title) setTitle(e.target.files[0].name);
    }
  };

  const toggleRole = (role: WorkspaceRole) => {
    setAllowedRoles(prev => (prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]));
  };

  const handleUpload = async () => {
    if (!file) {
      showToast('업로드할 파일을 선택해 주세요.', 'error');
      return;
    }
    if (visibility === 'RESTRICTED' && allowedRoles.length === 0) {
      showToast('역할별 공개로 올릴 때는 허용 역할을 하나 이상 골라 주세요.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await uploadDocument({
        file,
        title: title.trim() || undefined,
        visibility,
        // 워크스페이스 전체 공개라면 역할 목록을 보내지 않는다
        allowedRoles: visibility === 'RESTRICTED' ? allowedRoles : undefined,
      });
      showToast('파일을 업로드했습니다. 학습이 끝나면 AI 답변에 사용됩니다.', 'success');
      setFile(null);
      setTitle('');
      router.push('/file-management');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>문서 업로드</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>제목</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="비워 두면 파일 이름을 사용합니다"
            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>파일</label>
          <input type="file" onChange={handleFileChange} />
          {file && <p style={{ fontSize: '12px', color: '#6b7280' }}>{file.name}</p>}
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>공개 범위</label>
          <select
            value={visibility}
            onChange={e => setVisibility(e.target.value as DocumentVisibility)}
            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb' }}
          >
            <option value="WORKSPACE">워크스페이스 전체</option>
            <option value="RESTRICTED">역할별 공개</option>
          </select>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
            공개 범위는 업로드할 때만 정할 수 있습니다.
          </p>
        </div>
        {visibility === 'RESTRICTED' && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>허용 역할</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {ROLE_OPTIONS.map(role => (
                <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={allowedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  {getDisplayLabel(role)}
                </label>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => void handleUpload()}
          disabled={isLoading}
          style={{ padding: '12px', backgroundColor: '#0765FC', color: 'white', borderRadius: '8px' }}
        >
          {isLoading ? '업로드 중...' : '업로드'}
        </button>
      </div>
    </div>
  );
}
