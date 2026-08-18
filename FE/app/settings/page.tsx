'use client';
import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [emailNotification, setEmailNotification] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      showToast('설정이 저장되었습니다', 'success');
    } catch (err) {
      showToast('저장 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px' }}>
      <h1>사용자 설정</h1>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          <input type="checkbox" checked={emailNotification} onChange={e => setEmailNotification(e.target.checked)} />
          이메일 알림
        </label>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />
          다크 모드
        </label>
      </div>
      <button onClick={handleSave} disabled={isLoading} style={{ padding: '12px', backgroundColor: '#6366f1', color: 'white' }}>
        {isLoading ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}