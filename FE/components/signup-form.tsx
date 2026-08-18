'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup, AuthError } from '@/lib/auth';
import { saveAuthToken } from '@/lib/storage';

export function SignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState({
    terms: false,
    marketing: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setChecks(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (value.trim()) {
        setErrors(prev => {
          const { [name]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = '이름을 입력해 주세요.';
    if (!formData.email.trim()) newErrors.email = '이메일을 입력해 주세요.';
    if (!formData.password.trim()) newErrors.password = '비밀번호를 입력해 주세요.';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 서로 다릅니다.';
    }
    if (!checks.terms) {
      newErrors.terms = '이용약관에 동의해 주세요.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await signup({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
      });

      saveAuthToken(
        response.accessToken,
        response.userId,
        response.email,
        response.workspaces[0]?.id
      );
      router.push('/login?signup=success');
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.isConflict()) {
          setErrors(prev => ({ ...prev, email: '이미 가입된 이메일입니다.' }));
        } else {
          setErrors(prev => ({ ...prev, form: error.message }));
        }
      } else {
        setErrors(prev => ({ ...prev, form: '회원가입 중 오류가 발생했습니다.' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="title">계정 만들기</h2>
      <p className="subtitle">가입 후 업무 공간에 참여하면 30일 계획이 자동으로 만들어집니다.</p>

      <button className="google" type="button">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.4z" />
          <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46z" />
          <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-2.9.7-4.3v-5.7H4.5A22 22 0 0 0 2 24c0 3.6.9 6.9 2.5 9.9l7.3-5.6z" />
          <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.5 2 8.1 6.8 4.5 13.9l7.3 5.7c1.7-5.1 6.5-8.9 12.2-8.9z" />
        </svg>
        Google로 가입하기
      </button>

      <div className="or">또는 이메일로</div>

      <div className={`field ${errors.name ? 'invalid' : ''}`}>
        <label htmlFor="su-name">이름</label>
        <div className="control">
          <input
            id="su-name"
            type="text"
            placeholder="김세원"
            name="name"
            value={formData.name}
            onChange={handleChange}
            autoComplete="name"
          />
        </div>
        <p className="error">이름을 입력해 주세요.</p>
      </div>

      <div className={`field ${errors.email ? 'invalid' : ''}`}>
        <label htmlFor="su-email">회사 이메일</label>
        <div className="control">
          <input
            id="su-email"
            type="email"
            placeholder="name@company.com"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
          />
        </div>
        <p className="hint">초대를 받으셨다면 초대받은 주소로 가입해 주세요.</p>
        <p className="error">이메일을 입력해 주세요.</p>
      </div>

      <div className={`field ${errors.password ? 'invalid' : ''}`}>
        <label htmlFor="su-pw">비밀번호</label>
        <div className="control">
          <input
            id="su-pw"
            type={showPassword ? 'text' : 'password'}
            placeholder="8자 이상"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
          <button
            className="eye"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
        <p className="hint">영문과 숫자를 포함해 8자 이상으로 만들어 주세요.</p>
        <p className="error">비밀번호를 입력해 주세요.</p>
      </div>

      <div className={`field ${errors.confirmPassword ? 'invalid' : ''}`}>
        <label htmlFor="su-pw2">비밀번호 확인</label>
        <div className="control">
          <input
            id="su-pw2"
            type={showConfirm ? 'text' : 'password'}
            placeholder="비밀번호 다시 입력"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
          />
          <button
            className="eye"
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 표시'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
        <p className="error">비밀번호가 서로 다릅니다.</p>
      </div>

      <div className="terms">
        <label className="check">
          <input type="checkbox" name="terms" checked={checks.terms} onChange={handleChange} />
          <i className="mark" />
          <span>
            <a href="#">이용약관</a>과 <a href="#">개인정보 처리방침</a>에 동의합니다.{' '}
            <span style={{ color: 'var(--text-faint)' }}>(필수)</span>
          </span>
        </label>
        <label className="check">
          <input type="checkbox" name="marketing" checked={checks.marketing} onChange={handleChange} />
          <i className="mark" />
          <span>
            제품 업데이트 소식을 이메일로 받겠습니다.{' '}
            <span style={{ color: 'var(--text-faint)' }}>(선택)</span>
          </span>
        </label>
      </div>

      <button className="submit" type="submit" disabled={isLoading}>
        {isLoading ? '가입 중...' : '계정 만들기'}
      </button>

      <div className="notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span>가입만으로는 업무 공간에 들어가지 않습니다. 초대 링크를 열거나, 새 업무 공간을 직접 만들면 됩니다.</span>
      </div>

      <p className="foot">
        이미 계정이 있으신가요? <button className="link" type="button">로그인</button>
      </p>
    </form>
  );
}
