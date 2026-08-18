'use client';
import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { createTemplateAPI } from '@/lib/api';

export default function TemplateCreatePage() {
  const { showToast } = useToast();
  const [templateName, setTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!templateName) {
      showToast('템플릿 이름을 입력해주세요', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await createTemplateAPI({ name: templateName });
      showToast('템플릿이 생성되었습니다', 'success');
      setTemplateName('');
    } catch (err) {
      showToast('템플릿 생성 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>템플릿 생성</h1>
      <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="템플릿 이름" style={{ width: '100%', padding: '8px', marginBottom: '16px' }} />
      <button onClick={handleCreate} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white' }}>
        {isLoading ? '생성 중...' : '생성'}
      </button>
    </div>
  );
}