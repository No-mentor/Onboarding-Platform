'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, AuthError } from '@/lib/auth';
import { resendVerificationCode } from '@/lib/api';
import { saveAuthToken } from '@/lib/storage';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from './ui/modal';
import { useToast } from './ui/toast';

export function LoginForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  // 이메일 인증이 안 된 계정으로 로그인했을 때 띄우는 확인 모달
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

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

      const workspaces = response.workspaces ?? [];
      // 워크스페이스가 하나뿐일 때만 자동 선택한다. 없으면 이전 세션 값이 지워진다.
      saveAuthToken(
        response.accessToken,
        response.userId,
        response.email,
        response.name,
        workspaces.length === 1 ? workspaces[0].id : undefined
      );

      if (workspaces.length === 0) {
        router.push('/workspace-create');
      } else if (workspaces.length === 1) {
        router.push('/dashboard');
      } else {
        router.push('/workspace-selection');
      }
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.isAuthError()) {
          setErrors({ form: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        } else if (error.isEmailNotVerified()) {
          // 인증 링크 대신 인증 폼으로 안내한다
          setErrors({});
          setShowVerifyPrompt(true);
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

  /** 확인 모달을 닫았을 때: 왜 로그인이 막혔는지 폼에 남겨 둔다 */
  const handleDismissVerifyPrompt = () => {
    setShowVerifyPrompt(false);
    setErrors({ form: '이메일 인증이 완료되지 않아 로그인할 수 없습니다. 인증을 먼저 진행해 주세요.' });
  };

  /** 확인 모달에서 "진행하기" 를 눌렀을 때: 코드 재전송 후 인증 폼으로 이동 */
  const handleStartVerification = async () => {
    const targetEmail = email.trim();
    setIsSendingCode(true);
    try {
      await resendVerificationCode(targetEmail);
      localStorage.setItem('pending_verification_email', targetEmail);
      showToast('인증 코드가 전송되었습니다. 이메일을 확인해 주세요.', 'success');
      setShowVerifyPrompt(false);
      router.push(`/verify-email?email=${encodeURIComponent(targetEmail)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '인증 코드 전송에 실패했습니다.';
      showToast(message, 'error');
      setIsSendingCode(false);
    }
  };

  return (
    <>
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

    <Modal
      open={showVerifyPrompt}
      onClose={handleDismissVerifyPrompt}
      title="이메일 인증이 진행되지 않았습니다"
      subtitle={email.trim()}
      size="sm"
      closeOnBackdrop={!isSendingCode}
      footer={
        <>
          <ModalSecondaryButton onClick={handleDismissVerifyPrompt} disabled={isSendingCode}>
            나중에 하기
          </ModalSecondaryButton>
          <ModalPrimaryButton onClick={handleStartVerification} loading={isSendingCode}>
            진행하기
          </ModalPrimaryButton>
        </>
      }
    >
      <p style={{ fontSize: '13.5px', color: 'var(--text-sub)', lineHeight: '1.7' }}>
        아직 이메일 인증이 완료되지 않아 로그인할 수 없습니다.<br />
        지금 인증을 진행하시겠습니까? 진행하면 새 인증 코드를 다시 보내드립니다.
      </p>
    </Modal>
    </>
  );
}
