'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { fetchMe, logout, type MeResponse } from '@/lib/auth';
import { clearAuthToken, getAuthToken, getWorkspaceId, saveWorkspaceId } from '@/lib/storage';
import { getDisplayLabel } from '@/lib/display-labels';

export default function SettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setMe(await fetchMe(token, getWorkspaceId()));
    } catch (err) {
      setError(err instanceof Error ? err.message : '내 정보를 불러오지 못했습니다.');
      setMe(null);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleLogout = async () => {
    const token = getAuthToken();
    try {
      if (token) await logout(token);
    } catch {
      // 서버 로그아웃이 실패해도 클라이언트 토큰은 버린다
    }
    clearAuthToken();
    showToast('로그아웃했습니다.', 'success');
    router.replace('/login');
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '12px 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
  };

  return (
    <div style={{ padding: '40px', maxWidth: '640px', margin: '0 auto' }}>
      <h1>계정 설정</h1>

      {isLoading ? (
        <p>불러오는 중...</p>
      ) : error ? (
        <div>
          <p style={{ color: '#985050' }}>{error}</p>
          <button onClick={() => void load()} style={{ padding: '8px 14px', cursor: 'pointer' }}>다시 시도</button>
        </div>
      ) : me ? (
        <>
          <section style={{ marginTop: '24px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>내 정보</h2>
            <div style={rowStyle}><span>이름</span><span>{me.name}</span></div>
            <div style={rowStyle}><span>이메일</span><span>{me.email}</span></div>
            <div style={rowStyle}><span>부서</span><span>{me.profile?.department ?? '-'}</span></div>
            <div style={rowStyle}><span>직급</span><span>{me.profile?.title ?? '-'}</span></div>
            <div style={rowStyle}><span>경력</span><span>{me.profile?.careerLevel ?? '-'}</span></div>
          </section>

          <section style={{ marginTop: '32px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>참여 중인 업무 공간</h2>
            {me.workspaces.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                아직 참여 중인 업무 공간이 없습니다.{' '}
                <Link href="/workspace-create" style={{ color: '#0765FC' }}>새로 만들기</Link>
              </p>
            ) : (
              me.workspaces.map((workspace) => (
                <div key={workspace.id} style={rowStyle}>
                  <span>
                    {workspace.name}
                    {workspace.id === me.currentWorkspace?.id && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#0765FC' }}>현재</span>
                    )}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {getDisplayLabel(workspace.role)}
                    {workspace.id !== me.currentWorkspace?.id && (
                      <button
                        onClick={() => {
                          saveWorkspaceId(workspace.id);
                          router.push('/dashboard');
                        }}
                        style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        전환
                      </button>
                    )}
                  </span>
                </div>
              ))
            )}
          </section>

          <section style={{ marginTop: '32px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>계정</h2>
            <button
              onClick={() => void handleLogout()}
              style={{
                padding: '12px 18px',
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: '#985050',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              로그아웃
            </button>
          </section>

          <p style={{ marginTop: '28px', fontSize: '12.5px', color: '#9CA3AF', lineHeight: 1.7 }}>
            프로필과 알림 설정을 바꾸는 API는 아직 서버에 없습니다. 이름·부서 등은 워크스페이스 관리자가 초대할 때 지정합니다.
          </p>
        </>
      ) : null}
    </div>
  );
}
