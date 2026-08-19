'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, CheckCircle, RefreshCw, AlertCircle, Info } from 'lucide-react';
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
      showToast('이메일이 성공적으로 인증되었습니다.', 'success');
      localStorage.removeItem('pending_verification_email');
      router.push(`/signup-complete?email=${encodeURIComponent(email)}`);
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
      showToast('인증 코드가 이메일로 재전송되었습니다.', 'success');
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
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Icon Badge */}
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          backgroundColor: '#EEF2FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#4F46E5',
          marginBottom: '20px',
        }}
      >
        <Mail size={26} />
      </div>

      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
        이메일 인증
      </h2>
      <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.5, margin: 0 }}>
        회원가입을 완료하기 위해 전송된 6자리 코드를 입력해 주세요.
      </p>

      {/* Target Email Badge */}
      {email && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            margin: '16px 0 24px',
            padding: '8px 16px',
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: '24px',
            fontSize: '13.5px',
            color: '#374151',
            fontWeight: 500,
          }}
        >
          <Mail size={15} color="#4F46E5" />
          <span>{email}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 14px',
            background: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#DC2626',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ marginBottom: '28px', marginTop: email ? '0' : '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
            6자리 인증 코드
          </label>
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>유효시간 5분</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
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
                width: '50px',
                height: '56px',
                padding: '0',
                fontSize: '22px',
                fontWeight: 700,
                textAlign: 'center',
                border: code ? '1.5px solid #4F46E5' : '1.5px solid #D1D5DB',
                borderRadius: '12px',
                background: code ? '#F5F3FF' : '#FFFFFF',
                color: code ? '#4F46E5' : '#111827',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.16s ease',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#4F46E5';
                e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.15)';
              }}
              onBlur={e => {
                e.target.style.borderColor = code ? '#4F46E5' : '#D1D5DB';
                e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
              }}
              aria-label={`코드 ${index + 1}번째 자리`}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !isFilled}
        style={{
          width: '100%',
          height: '48px',
          backgroundColor: isFilled ? '#4F46E5' : '#9CA3AF',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '10px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: isFilled ? 'pointer' : 'not-allowed',
          transition: 'all 0.16s ease',
          boxShadow: isFilled ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none',
        }}
      >
        {isLoading ? '인증 진행 중...' : '인증 완료'}
      </button>

      {/* Resend Action */}
      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13.5px', color: '#6B7280' }}>
        이메일이 오지 않았나요?{' '}
        <button
          type="button"
          disabled={isLoading || isResending}
          onClick={handleResend}
          style={{
            background: 'none',
            border: 'none',
            color: '#4F46E5',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <RefreshCw size={13} className={isResending ? 'animate-spin' : ''} />
          {isResending ? '재전송 중...' : '인증 코드 다시 받기'}
        </button>
      </div>

      {/* Notice box */}
      <div
        style={{
          marginTop: '24px',
          padding: '12px 14px',
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          fontSize: '12.5px',
          color: '#6B7280',
          lineHeight: 1.5,
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}
      >
        <Info size={15} color="#9CA3AF" style={{ marginTop: '2px', flexShrink: 0 }} />
        <span>스팸 메일함도 확인해 보세요. 인증 코드는 발송 후 5분간 유효합니다.</span>
      </div>
    </form>
  );
}
