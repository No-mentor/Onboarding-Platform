'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import { createTemplate, type WorkspaceRole } from '@/lib/api';

const ROLE_OPTIONS: WorkspaceRole[] = ['NEW_HIRE', 'MEMBER', 'MANAGER'];

export default function TemplateCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [templateName, setTemplateName] = useState('');
  const [targetRole, setTargetRole] = useState<WorkspaceRole>('NEW_HIRE');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!templateName.trim()) {
      showToast('템플릿 이름을 입력해 주세요.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await createTemplate({
        name: templateName.trim(),
        targetRole,
        description: description.trim() || undefined,
      });
      showToast('템플릿을 생성했습니다.', 'success');
      router.push('/templates');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '템플릿 생성에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>템플릿 생성</h1>

      <label style={{ display: 'block', marginBottom: '8px' }}>템플릿 이름</label>
      <input
        type="text"
        value={templateName}
        onChange={e => setTemplateName(e.target.value)}
        placeholder="예: 마케팅 신입 기본"
        style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}
      />

      <label style={{ display: 'block', marginBottom: '8px' }}>대상 역할</label>
      <select
        value={targetRole}
        onChange={e => setTargetRole(e.target.value as WorkspaceRole)}
        style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}
      >
        {ROLE_OPTIONS.map(role => (
          <option key={role} value={role}>{getDisplayLabel(role)}</option>
        ))}
      </select>

      <label style={{ display: 'block', marginBottom: '8px' }}>설명</label>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={3}
        style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}
      />

      <button
        onClick={() => void handleCreate()}
        disabled={isLoading}
        style={{ padding: '12px', backgroundColor: '#0765FC', color: 'white', borderRadius: '8px' }}
      >
        {isLoading ? '생성 중...' : '생성'}
      </button>
    </div>
  );
}
