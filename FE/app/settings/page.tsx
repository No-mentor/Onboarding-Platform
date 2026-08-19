'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Bell, Sparkles, Shield, LogOut, Save } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { useToast } from '@/components/ui/toast';
import { getUserName, getUserEmail, clearAuthToken } from '@/lib/storage';

export default function SettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [userName, setUserName] = useState('사용자');
  const [userEmail, setUserEmail] = useState('user@company.com');
  const [emailNotification, setEmailNotification] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const name = getUserName();
    const email = getUserEmail();
    if (name) setUserName(name);
    if (email) setUserEmail(email);
  }, []);

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast('환경 설정이 성공적으로 저장되었습니다.', 'success');
    }, 400);
  };

  const handleLogout = () => {
    clearAuthToken();
    showToast('로그아웃되었습니다.', 'info');
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      <CommonSidebar />

      <main style={{ flex: 1, padding: '32px 40px', maxWidth: '900px' }}>
        <header style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>내 설정</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            개인 계정 정보, 알림 수신 방식 및 온보딩 환경 설정을 관리합니다.
          </p>
        </header>

        {/* 1. Profile Section */}
        <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="#4F46E5" /> 계정 프로필
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                이름
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
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
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                회사 이메일
              </label>
              <input
                type="email"
                value={userEmail}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14px',
                  backgroundColor: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  color: '#6B7280',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </section>

        {/* 2. Notifications & AI Preferences */}
        <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="#4F46E5" /> 알림 및 AI 추천 설정
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={emailNotification}
                onChange={(e) => setEmailNotification(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#4F46E5' }}
              />
              <span>온보딩 계획 마감 및 중요 체크리스트 알림 이메일 수신</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#4F46E5' }}
              />
              <span>매일 아침 오늘의 추천 할 일 요약 알림 수신</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={aiSuggestions}
                onChange={(e) => setAiSuggestions(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#4F46E5' }}
              />
              <span>AI 기반 맞춤형 인수인계 팁 및 참고 문서 자동 추천 활성화</span>
            </label>
          </div>

          <div style={{ marginTop: '20px' }}>
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
              {isLoading ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </section>

        {/* 3. Account Actions / Logout */}
        <section style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#6B7280" /> 계정 세션 관리
          </h2>
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
            현재 기기에서 안전하게 로그아웃합니다.
          </p>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} /> 로그아웃
          </button>
        </section>
      </main>
    </div>
  );
}