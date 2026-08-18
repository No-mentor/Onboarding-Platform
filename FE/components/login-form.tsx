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
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.isAuthError()) {
          setErrors({ form: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        } else if (error.isForbidden()) {
          setErrors({ form: '비활성화된 계정입니다.' });
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

      <button className="google" type="button" disabled={isLoading}>
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.4z" />
          <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46z" />
          <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-2.9.7-4.3v-5.7H4.5A22 22 0 0 0 2 24c0 3.6.9 6.9 2.5 9.9l7.3-5.6z" />
          <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.5 2 8.1 6.8 4.5 13.9l7.3 5.7c1.7-5.1 6.5-8.9 12.2-8.9z" />
        </svg>
        Google로 계속하기
      </button>

      <div className="or">또는 이메일로</div>

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
