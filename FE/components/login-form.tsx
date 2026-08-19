'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, AuthError } from '@/lib/auth';
import { saveAuthToken } from '@/lib/storage';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!email.trim()) newErrors.email = '이메일을 입력해 주세요.';
    if (!password.trim()) newErrors.password = '비밀번호를 입력해 주세요.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await login({
        email: email.trim(),
        password,
      });

      saveAuthToken(
        response.accessToken,
        response.userId,
        response.email,
        response.workspaces[0]?.id
      );

      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const redirectUrl = urlParams?.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/')) {
        router.push(redirectUrl);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      // 디버깅용 로그
      console.log('[Login Error]', error);
      if (error instanceof AuthError) {
        console.log('Error Status:', error.status);
        console.log('Error Message:', error.message);
      }

      if (error instanceof AuthError) {
        if (error.isAuthError()) {
          setErrors({ form: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        } else if (error.isForbidden()) {
          // email_verified 체크
          if (error.message && error.message.includes('이메일 인증')) {
            setErrors({ form: '이메일 인증이 완료되지 않았습니다. 가입 시 제공된 링크를 확인해주세요.' });
          } else {
            setErrors({ form: '비활성화된 계정입니다.' });
          }
        } else {
          setErrors({ form: error.message });
        }
      } else {
        setErrors({ form: '로그인 중 오류가 발생했습니다.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="title">다시 오셨네요</h2>
      <p className="subtitle">오늘 할 일과 인수인계 진행 상황이 기다리고 있어요.</p>

      {errors.form && (
        <div style={{ marginBottom: '26px', padding: '13px 14px', background: 'rgba(180,52,47,0.07)', borderRadius: 'var(--r-md)', fontSize: '12.5px', color: 'var(--danger)', lineHeight: '1.65' }}>
          {errors.form}
        </div>
      )}

      <div className={`field ${errors.email ? 'invalid' : ''}`}>
        <label htmlFor="li-email">회사 이메일</label>
        <div className="control">
          <input
            id="li-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (e.target.value.trim()) {
                setErrors(prev => {
                  const { email: _, ...rest } = prev;
                  return rest;
                });
              }
            }}
            autoComplete="email"
            disabled={isLoading}
          />
        </div>
        {errors.email && <p className="error">{errors.email}</p>}
      </div>

      <div className={`field ${errors.password ? 'invalid' : ''}`}>
        <label htmlFor="li-pw">비밀번호</label>
        <div className="control">
          <input
            id="li-pw"
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (e.target.value.trim()) {
                setErrors(prev => {
                  const { password: _, ...rest } = prev;
                  return rest;
                });
              }
            }}
            autoComplete="current-password"
            disabled={isLoading}
          />
          <button
            className="eye"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
        {errors.password && <p className="error">{errors.password}</p>}
      </div>

      <div className="row">
        <label className="check">
          <input type="checkbox" defaultChecked />
          <i className="mark" />
          <span>로그인 상태 유지</span>
        </label>
        <button className="link" type="button">
          비밀번호 찾기
        </button>
      </div>

      <button className="submit" type="submit" disabled={isLoading}>
        {isLoading ? '로그인 중...' : '로그인'}
      </button>

      <p className="foot">
        아직 계정이 없으신가요? <button className="link" type="button" disabled={isLoading}>회원가입</button>
      </p>
    </form>
  );
}
