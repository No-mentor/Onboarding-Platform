'use client';

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel, getDisplayLabels } from '@/lib/display-labels';
import { getDocumentDetail, type DocumentResponse } from '@/lib/api';

function DocumentPermissionContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const documentId = searchParams.get('id');

  const [document, setDocument] = useState<DocumentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!documentId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setDocument(await getDocumentDetail(documentId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : '문서를 불러오지 못했습니다.', 'error');
      setDocument(null);
    } finally {
      setIsLoading(false);
    }
  }, [documentId, showToast]);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>문서 권한</h1>

      {!documentId ? (
        <p>문서 ID가 없습니다. 파일 목록에서 문서를 선택해 주세요.</p>
      ) : isLoading ? (
        <p>불러오는 중...</p>
      ) : !document ? (
        <p>문서를 찾을 수 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
          <div><strong>제목</strong> · {document.title}</div>
          <div><strong>공개 범위</strong> · {document.visibility ? getDisplayLabel(document.visibility) : '-'}</div>
          <div><strong>허용 역할</strong> · {getDisplayLabels(document.allowedRoles)}</div>
          <div><strong>처리 상태</strong> · {getDisplayLabel(document.status)}</div>
        </div>
      )}

      <p style={{ marginTop: '24px', fontSize: '13px', color: '#6b7280', lineHeight: 1.7 }}>
        공개 범위와 허용 역할은 업로드할 때 정해집니다. 서버에 문서 권한 수정 API가 없어 이 화면에서는 바꿀 수 없고,
        권한을 바꾸려면 새 설정으로 다시 업로드해 주세요.
      </p>
      <Link href="/document-upload" style={{ fontSize: '13px', color: '#0765FC' }}>
        새 설정으로 업로드하기
      </Link>
    </div>
  );
}

export default function DocumentPermissionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>로딩 중...</div>}>
      <DocumentPermissionContent />
    </Suspense>
  );
}
