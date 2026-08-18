'use client';
import React, { useState, Suspense } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';
import { updateTemplate } from '@/lib/api';

function TemplateEditContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [templateName, setTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!templateName) {
      showToast('템플릿 이름을 입력해주세요', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const templateId = searchParams.get('id') || '';
      await updateTemplate(templateId, { name: templateName });
      showToast('템플릿이 수정되었습니다', 'success');
    } catch (err) {
      showToast('템플릿 수정 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>템플릿 수정</h1>
      <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="템플릿 이름" style={{ width: '100%', padding: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }} />
      <button onClick={handleSave} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white', borderRadius: '8px' }}>
        {isLoading ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}

export default function TemplateEditPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>로딩 중...</div>}>
      <TemplateEditContent />
    </Suspense>
  );
}
