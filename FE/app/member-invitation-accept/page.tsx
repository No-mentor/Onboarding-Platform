'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { acceptMemberInvitation } from '@/lib/api';
import { getAuthToken, saveWorkspaceId } from '@/lib/storage';
import { MailCheck, LogIn, ArrowRight, CheckCircle2 } from 'lucide-react';

interface MemberInvitationAcceptProps {
  tokenProp?: string;
}

export function MemberInvitationAcceptContent({ tokenProp }: MemberInvitationAcceptProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const inviteToken = tokenProp || searchParams.get('token') || '';
    setToken(inviteToken);
    const authToken = getAuthToken();
    setIsLoggedIn(!!authToken);
  }, [tokenProp, searchParams]);

  const handleAccept = async () => {
    if (!token) {
      showToast('초대 토큰 정보가 없습니다.', 'error');
      return;
    }

    if (!isLoggedIn) {
      // 로그인 페이지로 이동 후 돌아오도록 redirect 파라미터 전달
      const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    try {
      setIsLoading(true);
      const res = await acceptMemberInvitation(token);
      setIsSuccess(true);
      if (res.workspaceId) {
        saveWorkspaceId(res.workspaceId);
      }
      showToast('초대를 성공적으로 수락했습니다! 워크스페이스로 이동합니다.', 'success');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch (err: any) {
      const errorMsg = err?.message || '초대 수락에 실패했습니다. 만료되었거나 이미 참여한 초대입니다.';
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoLogin = () => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '24px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        padding: '40px 32px',
        textAlign: 'center'
      }}>
        {isSuccess ? (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
              초대 수락 완료!
            </h2>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
              워크스페이스 멤버로 성공적으로 등록되었습니다.<br />대시보드로 자동 이동 중입니다...
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#0765FC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <MailCheck size={36} />
            </div>

            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
              워크스페이스 멤버 초대
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px' }}>
              OnboardOS 워크스페이스에 초대되셨습니다.<br />
              초대를 수락하고 온보딩을 함께 시작해 보세요.
            </p>

            {isLoggedIn === false ? (
              <div style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.5' }}>
                  ⚠️ <strong>로그인이 필요합니다</strong><br />
                  초대를 수락하려면 먼저 로그인하거나 회원가입을 완료해 주세요.
                </div>
              </div>
            ) : null}

            {isLoggedIn === false ? (
              <button
                onClick={handleGoLogin}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: '#0765FC',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s'
                }}
              >
                <LogIn size={18} />
                로그인 후 초대 수락하기
              </button>
            ) : (
              <button
                onClick={handleAccept}
                disabled={isLoading || !token}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: '#0765FC',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: isLoading || !token ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !token ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s'
                }}
              >
                {isLoading ? '수락 처리 중...' : '초대 수락 및 입장하기'}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MemberInvitationAcceptPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        초대 정보를 불러오는 중...
      </div>
    }>
      <MemberInvitationAcceptContent />
    </Suspense>
  );
}