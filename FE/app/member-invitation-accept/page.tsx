'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { acceptMemberInvitation, getInvitationPreview, type InvitationPreview } from '@/lib/api';
import { clearAuthToken, saveWorkspaceId } from '@/lib/storage';
import { useAuthUser } from '@/lib/use-auth-user';
import { getDisplayLabel } from '@/lib/display-labels';
import { LogIn, ArrowRight, CheckCircle2, AlertCircle, UserRoundX, Building2 } from 'lucide-react';

interface MemberInvitationAcceptProps {
  tokenProp?: string;
}

/**
 * 화면이 취할 수 있는 상태.
 * - loading/invalid: 초대 정보 조회 전후
 * - blocked: 만료·철회·이미 수락 (서버가 acceptable=false 로 알려 준다)
 * - needs-login / wrong-account / ready: 로그인 상태에 따른 분기
 */
type ViewState = 'loading' | 'invalid' | 'blocked' | 'needs-login' | 'wrong-account' | 'ready' | 'success';

const CARD_STYLE: React.CSSProperties = {
  maxWidth: '480px',
  width: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  border: '1px solid #e2e8f0',
  padding: '40px 32px',
};

const PRIMARY_BUTTON_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '14px 20px',
  backgroundColor: '#0765FC',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

const SECONDARY_BUTTON_STYLE: React.CSSProperties = {
  ...PRIMARY_BUTTON_STYLE,
  backgroundColor: '#ffffff',
  color: '#334155',
  border: '1px solid #cbd5e1',
  marginTop: '10px',
};

function Badge({ children, tone }: { children: React.ReactNode; tone: 'blue' | 'red' | 'green' }) {
  const tones = {
    blue: { bg: '#eff6ff', fg: '#0765FC' },
    red: { bg: '#fef2f2', fg: '#b4342f' },
    green: { bg: '#ecfdf5', fg: '#10b981' },
  } as const;
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '999px',
      backgroundColor: tones[tone].bg,
      color: tones[tone].fg,
      fontSize: '12px',
      fontWeight: 600,
    }}>
      {children}
    </span>
  );
}

function CircleIcon({ tone, children }: { tone: 'blue' | 'red' | 'green'; children: React.ReactNode }) {
  const tones = {
    blue: { bg: '#eff6ff', fg: '#0765FC' },
    red: { bg: '#fef2f2', fg: '#b4342f' },
    green: { bg: '#ecfdf5', fg: '#10b981' },
  } as const;
  return (
    <div style={{
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      backgroundColor: tones[tone].bg,
      color: tones[tone].fg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px auto',
    }}>
      {children}
    </div>
  );
}

/** 초대 내용 요약표. 로그인 전에도 보여 주는 부분 */
function InvitationSummary({ preview }: { preview: InvitationPreview }) {
  const rows: Array<[string, React.ReactNode]> = [
    ['워크스페이스', preview.workspaceName],
    ['부여되는 역할', getDisplayLabel(preview.role)],
    ['초대받은 주소', preview.email],
  ];
  if (preview.department) rows.push(['부서', preview.department]);
  if (preview.title) rows.push(['직급', preview.title]);
  rows.push(['수락 기한', formatExpiry(preview.expiresAt)]);

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '24px',
      textAlign: 'left',
    }}>
      {rows.map(([label, value], index) => (
        <div
          key={label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '12px 16px',
            borderTop: index === 0 ? 'none' : '1px solid #e2e8f0',
            fontSize: '13px',
          }}
        >
          <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{label}</span>
          <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 만료 시각을 사용자 시간대 기준으로 표시한다 */
function formatExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })} ${date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })} 까지`;
}

export function MemberInvitationAcceptContent({ tokenProp }: MemberInvitationAcceptProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  // 로그인 상태는 useAuthUser 로 구독한다. 계정 전환 후 화면이 알아서 다시 그려진다
  const authUser = useAuthUser();
  const token = tokenProp || searchParams.get('token') || '';

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    getInvitationPreview(token)
      .then(data => {
        if (!cancelled) setPreview(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : '초대 정보를 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  /** 로그인/회원가입 화면으로 보낼 때 초대받은 주소를 미리 채워 주고, 끝나면 이 화면으로 돌아오게 한다 */
  const authUrl = (tab: 'login' | 'signup') => {
    const redirect = typeof window === 'undefined'
      ? ''
      : window.location.pathname + window.location.search;
    const params = new URLSearchParams();
    if (redirect) params.set('redirect', redirect);
    if (preview?.email) params.set('email', preview.email);
    if (tab === 'signup') params.set('tab', 'signup');
    return `/login?${params.toString()}`;
  };

  const handleSwitchAccount = () => {
    const target = authUrl('login');
    clearAuthToken();
    router.push(target);
  };

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    try {
      const res = await acceptMemberInvitation(token);
      if (res.workspaceId) saveWorkspaceId(res.workspaceId);
      setIsSuccess(true);
      showToast('초대를 수락했습니다. 워크스페이스로 이동합니다.', 'success');
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '초대 수락에 실패했습니다.';
      showToast(message, 'error');
      // 서버가 거절한 이유를 화면에도 반영한다 (이미 멤버·만료 등)
      getInvitationPreview(token).then(setPreview).catch(() => undefined);
    } finally {
      setIsAccepting(false);
    }
  };

  const state: ViewState = (() => {
    if (isSuccess) return 'success';
    if (!token || loadError) return 'invalid';
    if (!preview) return 'loading';
    if (!preview.acceptable) return 'blocked';
    if (!authUser) return 'needs-login';
    if (authUser.email.toLowerCase() !== preview.email.toLowerCase()) return 'wrong-account';
    return 'ready';
  })();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '24px',
      fontFamily: 'sans-serif',
    }}>
      <div style={CARD_STYLE}>
        {state === 'loading' && (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', margin: 0 }}>
            초대 정보를 확인하는 중...
          </p>
        )}

        {state === 'invalid' && (
          <div style={{ textAlign: 'center' }}>
            <CircleIcon tone="red"><AlertCircle size={36} /></CircleIcon>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>
              초대를 찾을 수 없습니다
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              {loadError ?? '초대 토큰 정보가 없습니다. 메일의 링크를 다시 열어 주세요.'}
            </p>
          </div>
        )}

        {state === 'blocked' && preview && (
          <div style={{ textAlign: 'center' }}>
            <CircleIcon tone="red"><AlertCircle size={36} /></CircleIcon>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>
              사용할 수 없는 초대입니다
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7, margin: '0 0 24px 0' }}>
              {preview.acceptBlockedReason ?? '이 초대는 더 이상 유효하지 않습니다.'}
            </p>
            <InvitationSummary preview={preview} />
            {preview.status === 'ACCEPTED' && (
              <button style={PRIMARY_BUTTON_STYLE} onClick={() => router.push('/dashboard')}>
                워크스페이스로 이동
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}

        {(state === 'needs-login' || state === 'wrong-account' || state === 'ready') && preview && (
          <div style={{ textAlign: 'center' }}>
            <CircleIcon tone="blue">
              {state === 'wrong-account' ? <UserRoundX size={34} /> : <Building2 size={32} />}
            </CircleIcon>

            <div style={{ marginBottom: '10px' }}>
              <Badge tone="blue">{getDisplayLabel(preview.role)}로 초대</Badge>
            </div>

            <h1 style={{ fontSize: '21px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0', lineHeight: 1.45 }}>
              {preview.inviterName
                ? <><strong>{preview.inviterName}</strong> 님이<br />{preview.workspaceName} 워크스페이스로 초대했습니다</>
                : <>{preview.workspaceName} 워크스페이스에<br />초대되었습니다</>}
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7, margin: '0 0 24px 0' }}>
              수락하면 역할에 맞는 30일 온보딩 계획과 오늘 할 일이 준비됩니다.
            </p>

            <InvitationSummary preview={preview} />

            {state === 'needs-login' && (
              <>
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#475569',
                  lineHeight: 1.7,
                }}>
                  이 초대는 <strong style={{ color: '#0f172a' }}>{preview.email}</strong> 계정으로만 수락할 수 있습니다.
                  로그인하거나 이 주소로 계정을 만들면 이 화면으로 돌아옵니다.
                </div>
                <button style={PRIMARY_BUTTON_STYLE} onClick={() => router.push(authUrl('login'))}>
                  <LogIn size={18} />
                  로그인하고 수락하기
                </button>
                <button style={SECONDARY_BUTTON_STYLE} onClick={() => router.push(authUrl('signup'))}>
                  이 주소로 계정 만들기
                </button>
              </>
            )}

            {state === 'wrong-account' && (
              <>
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#92400e',
                  lineHeight: 1.8,
                }}>
                  지금 <strong>{authUser?.email}</strong> 계정으로 로그인되어 있습니다.<br />
                  이 초대는 <strong>{preview.email}</strong> 계정으로만 수락할 수 있습니다.
                </div>
                <button style={PRIMARY_BUTTON_STYLE} onClick={handleSwitchAccount}>
                  <LogIn size={18} />
                  {preview.email} 로 로그인하기
                </button>
                <button style={SECONDARY_BUTTON_STYLE} onClick={() => router.push('/dashboard')}>
                  현재 계정으로 계속하기
                </button>
              </>
            )}

            {state === 'ready' && (
              <button
                style={{ ...PRIMARY_BUTTON_STYLE, opacity: isAccepting ? 0.7 : 1, cursor: isAccepting ? 'not-allowed' : 'pointer' }}
                onClick={handleAccept}
                disabled={isAccepting}
              >
                {isAccepting ? '수락 처리 중...' : '초대 수락하고 시작하기'}
                {!isAccepting && <ArrowRight size={18} />}
              </button>
            )}
          </div>
        )}

        {state === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <CircleIcon tone="green"><CheckCircle2 size={36} /></CircleIcon>
            <h2 style={{ fontSize: '21px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>
              초대 수락 완료
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              {preview?.workspaceName ?? '워크스페이스'} 멤버로 등록되었습니다.<br />
              대시보드로 이동 중입니다...
            </p>
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
