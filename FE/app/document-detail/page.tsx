'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';
import { getDocumentDetail } from '@/lib/api';

function DocumentDetailContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [document, setDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const docId = searchParams.get('id');
        if (!docId) throw new Error('문서 ID 없음');
        const doc = await getDocumentDetail(docId);
        setDocument(doc);
      } catch (err) {
        showToast('문서를 불러올 수 없습니다', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: '40px' }}>
      <h1>문서 상세</h1>
      {isLoading ? <p>로딩 중...</p> : document ? <pre>{JSON.stringify(document, null, 2)}</pre> : <p>문서를 찾을 수 없습니다</p>}
    </div>
  );
}

export default function DocumentDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>로딩 중...</div>}>
      <DocumentDetailContent />
    </Suspense>
  );
}