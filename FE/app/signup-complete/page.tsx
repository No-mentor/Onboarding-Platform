'use client';

import React, { Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

function SignupCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const redirect = searchParams.get('redirect');

  /** 초대 링크에서 시작한 가입이면 로그인 후 그 화면으로 돌아가도록 파라미터를 이어 준다 */
  const loginHref = (() => {
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (redirect && redirect.startsWith('/')) params.set('redirect', redirect);
    return params.size > 0 ? `/login?${params.toString()}` : '/login';
  })();

  return (
    <div className="auth">
      <aside className="brand">
        <div className="logo">
          <Image src="/logo.png" alt="MenTalk Logo" width={80} height={80} priority />
          <span>MenTalk</span>
        </div>

        <div className="brand-copy">
          <h1>가입이 완료됐어요.</h1>
          <p>이제 로그인하면 업무 공간에 참여하고 30일 계획을 받아볼 수 있습니다.</p>
        </div>

        <p className="brand-foot">© 2026 MenTalk</p>
      </aside>

      <main className="pane">
        <div className="card">
          <div
            style={{
              width: '52px',
              height: '52px',
              marginBottom: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'var(--surface-sunk)',
              color: 'var(--accent)',
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <h2 className="title">가입이 완료되었습니다</h2>
          <p className="subtitle">
            {email ? `${email} 계정의 이메일 인증이 완료되었습니다. ` : '이메일 인증이 완료되었습니다. '}
            이제 로그인해 시작해 보세요.
          </p>

          <button
            className="submit"
            type="button"
            style={{ marginTop: '30px' }}
            onClick={() => router.push(loginHref)}
          >
            로그인하러 가기
          </button>

          <div className="notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>가입만으로는 업무 공간에 들어가지 않습니다. 초대 링크를 열거나, 새 업무 공간을 직접 만들면 됩니다.</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignupCompletePage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>}>
      <SignupCompleteContent />
    </Suspense>
  );
}
