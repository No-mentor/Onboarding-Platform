'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from './ui/toast';
import { verifyEmail, resendVerificationCode } from '@/lib/api';

export function EmailVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    } else {
      const storedEmail = localStorage.getItem('pending_verification_email');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, [searchParams]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) return;

    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length > 0) {
      const newCodes = digits.split('');
      while (newCodes.length < 6) newCodes.push('');
      setCodes(newCodes);

      if (digits.length === 6) {
        inputRefs.current[5]?.focus();
      } else {
        inputRefs.current[digits.length]?.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codes.join('');

    if (code.length !== 6) {
      setError('6자리 코드를 모두 입력해 주세요.');
      return;
    }

    if (!email) {
      setError('이메일 정보가 없습니다.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail(email, code);
      showToast('이메일이 인증되었습니다.', 'success');
      localStorage.removeItem('pending_verification_email');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '인증에 실패했습니다';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('이메일 정보가 없습니다.');
      return;
    }

    setIsResending(true);
    try {
      await resendVerificationCode(email);
      showToast('인증 코드가 재전송되었습니다.', 'success');
      setCodes(['', '', '', '', '', '']);
      setError('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '코드 재전송 실패';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsResending(false);
    }
  };

  const isFilled = codes.every(code => code !== '');

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="title">이메일 인증</h2>
      <p className="subtitle">
        입력하신 이메일로 전송된 6자리 코드를 입력해 주세요.
      </p>

      {error && (
        <div style={{ marginBottom: '26px', padding: '13px 14px', background: 'rgba(180,52,47,0.07)', borderRadius: 'var(--r-md)', fontSize: '12.5px', color: 'var(--danger)', lineHeight: '1.65' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '26px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-sub)', marginBottom: '12px' }}>
          인증 코드
        </label>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {codes.map((code, index) => (
            <input
              key={index}
              ref={el => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={code}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              onPaste={handlePaste}
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
        disabled={isLoading || !isFilled}
        style={{ opacity: !isFilled ? 0.5 : 1 }}
      >
        {isLoading ? '인증 중...' : '인증 완료'}
      </button>

      <p className="foot">
        코드를 받지 못했나요? <button className="link" type="button" disabled={isLoading || isResending} onClick={handleResend}>
          {isResending ? '재전송 중...' : '재전송'}
        </button>
      </p>
    </form>
  );
}
