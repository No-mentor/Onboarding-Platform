'use client';

import React, { useState } from 'react';
import { LoginForm } from './login-form';
import { SignupForm } from './signup-form';

export function AuthTabs() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

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
        <LoginForm />
      </section>

      <section
        className="view"
        id="view-signup"
        role="tabpanel"
        aria-labelledby="tab-signup"
        hidden={activeTab !== 'signup'}
      >
        <SignupForm />
      </section>
    </>
  );
}
