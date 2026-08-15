'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // 필드 검증
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

    // API 호출
    setIsLoading(true);
    try {
      const response = await signup({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
      });

      // 토큰 저장
      saveAuthToken(response.accessToken, response.userId, response.email);

      // 회원가입 성공 후 로그인 페이지로 이동
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-section-title text-text">계정 만들기</h2>
        <p className="text-[13.5px] text-body mt-2">
          가입 후 업무 공간에 참여하면 30일 계획이 자동으로 만들어집니다.
        </p>
      </div>

      {/* 폼 전체 에러 메시지 */}
      {errors.form && (
        <div className="p-3 rounded-[10px] bg-[rgba(180,52,47,0.07)] text-destructive text-[13px]">
          {errors.form}
        </div>
      )}

      {/* Google 가입 */}
      <Button
        type="button"
        variant="secondary"
        className="w-full flex items-center justify-center gap-2"
      >
        <svg
          viewBox="0 0 48 48"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.4z" />
          <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46z" />
          <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-2.9.7-4.3v-5.7H4.5A22 22 0 0 0 2 24c0 3.6.9 6.9 2.5 9.9l7.3-5.6z" />
          <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.5 2 8.1 6.8 4.5 13.9l7.3 5.7c1.7-5.1 6.5-8.9 12.2-8.9z" />
        </svg>
        Google로 가입하기
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[12px] text-muted">또는 이메일로</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* 이름 */}
      <div>
        <label htmlFor="signup-name" className="block text-label text-body font-semibold mb-2">
          이름
        </label>
        <Input
          id="signup-name"
          type="text"
          placeholder="김세원"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          autoComplete="name"
        />
      </div>

      {/* 이메일 */}
      <div>
        <label htmlFor="signup-email" className="block text-label text-body font-semibold mb-2">
          회사 이메일
        </label>
        <Input
          id="signup-email"
          type="email"
          placeholder="name@company.com"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          hint={!errors.email ? '초대를 받으셨다면 초대받은 주소로 가입해 주세요.' : undefined}
          autoComplete="email"
        />
      </div>

      {/* 비밀번호 */}
      <div>
        <label htmlFor="signup-password" className="block text-label text-body font-semibold mb-2">
          비밀번호
        </label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="8자 이상"
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            hint={!errors.password ? '영문과 숫자를 포함해 8자 이상으로 만들어 주세요.' : undefined}
            autoComplete="new-password"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body transition-colors"
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 비밀번호 확인 */}
      <div>
        <label htmlFor="signup-confirm" className="block text-label text-body font-semibold mb-2">
          비밀번호 확인
        </label>
        <div className="relative">
          <Input
            id="signup-confirm"
            type={showConfirm ? 'text' : 'password'}
            placeholder="비밀번호 다시 입력"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            autoComplete="new-password"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body transition-colors"
            aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 표시'}
          >
            {showConfirm ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 약관 동의 */}
      <div className="space-y-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={checks.terms}
            onChange={(e) => {
              setChecks(prev => ({ ...prev, terms: (e.target as any).checked }));
              setErrors(prev => ({ ...prev, terms: '' }));
            }}
            className="mt-1"
          />
          <span className="text-[13px] text-body leading-[1.55]">
            <a href="#" className="text-text underline underline-offset-2 hover:no-underline">
              이용약관
            </a>
            과{' '}
            <a href="#" className="text-text underline underline-offset-2 hover:no-underline">
              개인정보 처리방침
            </a>
            에 동의합니다.{' '}
            <span className="text-muted">(필수)</span>
          </span>
        </label>
        {errors.terms && (
          <p className="text-[12px] text-destructive">{errors.terms}</p>
        )}
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={checks.marketing}
            onChange={(e) => setChecks(prev => ({ ...prev, marketing: (e.target as any).checked }))}
            className="mt-1"
          />
          <span className="text-[13px] text-body leading-[1.55]">
            제품 업데이트 소식을 이메일로 받겠습니다.{' '}
            <span className="text-muted">(선택)</span>
          </span>
        </label>
      </div>

      {/* 계정 만들기 버튼 */}
      <Button
        type="submit"
        variant="primary"
        size="xl"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? '가입 중...' : '계정 만들기'}
      </Button>

      {/* 안내 */}
      <div className="flex gap-3 p-[13px_14px] bg-surface-sunk rounded-[10px]">
        <Info className="w-4 h-4 flex-none text-muted mt-[2px]" />
        <p className="text-[12.5px] text-body leading-[1.65]">
          가입만으로는 업무 공간에 들어가지 않습니다. 초대 링크를 열거나, 새 업무 공간을 직접 만들면 됩니다.
        </p>
      </div>

      {/* 로그인 링크 */}
      <p className="text-center text-[13px] text-body">
        이미 계정이 있으신가요?{' '}
        <button type="button" className="font-semibold text-text hover:underline">
          로그인
        </button>
      </p>
    </form>
  );
}
