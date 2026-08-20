'use client';

import React, { useState, useEffect } from 'react';
import { LoginForm } from './login-form';
import { SignupForm } from './signup-form';

type AuthTab = 'login' | 'signup';

export function AuthTabs({ initialTab = 'login' }: { initialTab?: AuthTab }) {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  // 초대 화면에서 "계정 만들기" 로 넘어오면 회원가입 탭이 먼저 열려야 한다.
  // (서버 렌더 결과와 어긋나지 않도록 마운트 후에 바꾼다)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('tab') === 'signup') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('signup');
    }
  }, []);

  return (
    <>
      <div className="switch" role="tablist">
        <button
          role="tab"
          id="tab-login"
          aria-controls="view-login"
          aria-selected={activeTab === 'login'}
          onClick={() => setActiveTab('login')}
        >
          로그인
        </button>
        <button
          role="tab"
          id="tab-signup"
          aria-controls="view-signup"
          aria-selected={activeTab === 'signup'}
          onClick={() => setActiveTab('signup')}
        >
          회원가입
        </button>
      </div>

      <section
        className="view"
        id="view-login"
        role="tabpanel"
        aria-labelledby="tab-login"
        hidden={activeTab !== 'login'}
      >
        <LoginForm onSwitchToSignup={() => setActiveTab('signup')} />
      </section>

      <section
        className="view"
        id="view-signup"
        role="tabpanel"
        aria-labelledby="tab-signup"
        hidden={activeTab !== 'signup'}
      >
        <SignupForm onSwitchToLogin={() => setActiveTab('login')} />
      </section>
    </>
  );
}
