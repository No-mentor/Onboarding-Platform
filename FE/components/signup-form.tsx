'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export function SignupForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [checks, setChecks] = useState({
    terms: false,
    marketing: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};

    if (!formData.name.trim()) newErrors.name = true;
    if (!formData.email.trim()) newErrors.email = true;
    if (!formData.password.trim()) newErrors.password = true;
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = true;

    setErrors(newErrors);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-section-title text-text">계정 만들기</h2>
        <p className="text-[13.5px] text-body mt-2">
          가입 후 업무 공간에 참여하면 30일 계획이 자동으로 만들어집니다.
        </p>
      </div>

      {/* Google 가입 */}
      <Button
        type="button"
        variant="secondary"
        className="w-full flex items-center justify-center gap-2"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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
          error={errors.name ? '이름을 입력해 주세요.' : undefined}
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
          error={errors.email ? '올바른 이메일 형식이 아닙니다.' : undefined}
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
            error={errors.password ? '영문과 숫자를 포함해 8자 이상이어야 합니다.' : undefined}
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
            error={errors.confirmPassword ? '비밀번호가 서로 다릅니다.' : undefined}
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
            onChange={(e) => setChecks(prev => ({ ...prev, terms: e.target.checked }))}
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
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={checks.marketing}
            onChange={(e) => setChecks(prev => ({ ...prev, marketing: e.target.checked }))}
            className="mt-1"
          />
          <span className="text-[13px] text-body leading-[1.55]">
            제품 업데이트 소식을 이메일로 받겠습니다.{' '}
            <span className="text-muted">(선택)</span>
          </span>
        </label>
      </div>

      {/* 계정 만들기 버튼 */}
      <Button type="submit" variant="primary" size="xl" className="w-full">
        계정 만들기
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
