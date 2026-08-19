'use client';

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { uploadDocument } from '@/lib/api';

export default function DocumentUploadPage() {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      showToast('파일과 제목을 입력해주세요', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      await uploadDocument(formData);
      showToast('파일이 업로드되었습니다', 'success');
      setFile(null);
      setTitle('');
    } catch (err) {
      showToast('파일 업로드 실패', 'error');
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
            placeholder="문서 제목"
            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>파일</label>
          <input type="file" onChange={handleFileChange} />
          {file && <p style={{ fontSize: '12px', color: '#6b7280' }}>{file.name}</p>}
        </div>
        <button
          onClick={handleUpload}
          disabled={isLoading}
          style={{ padding: '12px', backgroundColor: '#0765FC', color: 'white', borderRadius: '8px' }}
        >
          {isLoading ? '업로드 중...' : '업로드'}
        </button>
      </div>
    </div>
  );
}
