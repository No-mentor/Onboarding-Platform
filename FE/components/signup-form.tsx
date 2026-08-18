'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signup, AuthError } from '@/lib/auth';
import { verifyEmail, resendVerificationCode } from '@/lib/api';
import { useToast } from './ui/toast';

export function SignupForm() {
  const router = useRouter();
  const { showToast } = useToast();

  // 회원가입 정보
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // 인증 코드
  const [verificationCodes, setVerificationCodes] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // UI 상태
  const [signupStep, setSignupStep] = useState<'form' | 'verification'>('form');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState({
    terms: false,
    marketing: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

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

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) return;

    const newCodes = [...verificationCodes];
    newCodes[index] = value;
    setVerificationCodes(newCodes);

    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCodes[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length > 0) {
      const newCodes = digits.split('');
      while (newCodes.length < 6) newCodes.push('');
      setVerificationCodes(newCodes);

      if (digits.length === 6) {
        codeInputRefs.current[5]?.focus();
      } else {
        codeInputRefs.current[digits.length]?.focus();
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
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

      // 디버깅용 로그
      console.log('[Signup Response]', response);
      console.log('emailSent:', response.emailSent);

      if (response.emailSent) {
        showToast('인증 코드가 발송되었습니다. 이메일을 확인해주세요.', 'success');
        setSignupStep('verification');
        setVerificationCodes(['', '', '', '', '', '']);
        codeInputRefs.current[0]?.focus();
      } else {
        showToast('회원가입은 완료되었으나 인증 코드 발송에 실패했습니다. 재발송을 시도해주세요.', 'error');
        setSignupStep('verification');
      }
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.isConflict()) {
          setErrors(prev => ({ ...prev, email: '이미 가입된 이메일입니다.' }));
          showToast('이미 가입된 이메일입니다.', 'error');
        } else {
          setErrors(prev => ({ ...prev, form: error.message }));
          showToast(error.message, 'error');
        }
      } else {
        setErrors(prev => ({ ...prev, form: '회원가입 중 오류가 발생했습니다.' }));
        showToast('회원가입 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verificationCodes.join('');

    if (code.length !== 6) {
      showToast('6자리 코드를 모두 입력해 주세요.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail(formData.email.trim(), code);
      showToast('이메일이 인증되었습니다.', 'success');
      setTimeout(() => router.push('/login'), 1500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '인증에 실패했습니다';
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerificationCode(formData.email.trim());
      showToast('인증 코드가 재전송되었습니다.', 'success');
      setVerificationCodes(['', '', '', '', '', '']);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '코드 재전송 실패';
      showToast(errorMsg, 'error');
    } finally {
      setIsResending(false);
    }
  };

  if (signupStep === 'verification') {
    return (
      <form onSubmit={handleVerify}>
        <h2 className="title">이메일 인증</h2>
        <p className="subtitle">
          {formData.email}으로 전송된 6자리 코드를 입력해 주세요.
        </p>

        <div className="field">
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-sub)', marginBottom: '12px' }}>
            인증 코드
          </label>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}>
            {verificationCodes.map((code, index) => (
              <input
                key={index}
                ref={el => {
                  codeInputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={code}
                onChange={e => handleCodeChange(index, e.target.value)}
                onKeyDown={e => handleCodeKeyDown(index, e)}
                onPaste={handleCodePaste}
                disabled={isLoading}
                style={{
                  width: '44px',
                  height: '44px',
                  padding: '0',
                  fontSize: '18px',
                  fontWeight: '600',
                  textAlign: 'center',
                  border: `1px solid var(--border-strong)`,
                  borderRadius: 'var(--r-md)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  outline: 'none',
                  transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--accent)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(78, 78, 82, 0.11)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-strong)';
                  e.target.style.boxShadow = 'none';
                }}
                aria-label={`코드 ${index + 1}번째 자리`}
              />
            ))}
          </div>
          <p style={{ marginTop: '7px', fontSize: '12px', color: 'var(--text-faint)', lineHeight: '1.5' }}>
            붙여넣기(Ctrl+V)로 한 번에 입력할 수도 있습니다.
          </p>
        </div>

        <button
          className="submit"
          type="submit"
          disabled={isLoading || verificationCodes.every(code => code === '')}
          style={{ opacity: verificationCodes.every(code => code === '') ? 0.5 : 1 }}
        >
          {isLoading ? '인증 중...' : '인증 완료'}
        </button>

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <p className="foot">
            코드를 받지 못했나요? <button className="link" type="button" disabled={isLoading || isResending} onClick={handleResend}>
              {isResending ? '재전송 중...' : '재전송'}
            </button>
          </p>

          <p className="foot">
            <button className="link" type="button" disabled={isLoading} onClick={() => setSignupStep('form')}>
              이전으로
            </button>
          </p>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSignup}>
      <h2 className="title">계정 만들기</h2>
      <p className="subtitle">가입 후 업무 공간에 참여하면 30일 계획이 자동으로 만들어집니다.</p>

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
            disabled={isLoading}
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
            disabled={isLoading}
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
            disabled={isLoading}
          />
          <button
            className="eye"
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 표시'}
            disabled={isLoading}
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
          <input type="checkbox" name="terms" checked={checks.terms} onChange={handleChange} disabled={isLoading} />
          <i className="mark" />
          <span>
            <a href="#">이용약관</a>과 <a href="#">개인정보 처리방침</a>에 동의합니다.{' '}
            <span style={{ color: 'var(--text-faint)' }}>(필수)</span>
          </span>
        </label>
        <label className="check">
          <input type="checkbox" name="marketing" checked={checks.marketing} onChange={handleChange} disabled={isLoading} />
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
        이미 계정이 있으신가요? <button className="link" type="button" disabled={isLoading}>로그인</button>
      </p>
    </form>
  );
}
