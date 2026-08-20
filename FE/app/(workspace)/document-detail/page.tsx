'use client';
import React, { useState, Suspense } from 'react';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';
import { getDocumentDetail, reprocessDocument } from '@/lib/api';

function DocumentDetailContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [document, setDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
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

  const handleReprocess = async () => {
    try {
      setIsProcessing(true);
      const docId = searchParams.get('id') || '';
      await reprocessDocument(docId);
      showToast('문서가 재처리되었습니다', 'success');
    } catch (err) {
      showToast('재처리 실패', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '40px' }}>
      <h1>문서 상세</h1>
      {isLoading ? <p>로딩 중...</p> : document ? (
        <>
          <pre>{JSON.stringify(document, null, 2)}</pre>
          <button onClick={handleReprocess} disabled={isProcessing} style={{ padding: '12px', backgroundColor: '#0765FC', color: 'white', borderRadius: '8px', marginTop: '16px' }}>
            {isProcessing ? '처리 중...' : '재처리'}
          </button>
        </>
      ) : <p>문서를 찾을 수 없습니다</p>}
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