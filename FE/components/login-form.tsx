'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};
    if (!email.trim()) newErrors.email = true;
    if (!password.trim()) newErrors.password = true;
    setErrors(newErrors);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-section-title text-text">다시 오셨네요</h2>
        <p className="text-[13.5px] text-body mt-2">
          오늘 할 일과 인수인계 진행 상황이 기다리고 있어요.
        </p>
      </div>

      {/* Google 로그인 */}
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
        Google로 계속하기
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[12px] text-muted">또는 이메일로</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* 이메일 입력 */}
      <div>
        <label htmlFor="login-email" className="block text-label text-body font-semibold mb-2">
          회사 이메일
        </label>
        <Input
          id="login-email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors(prev => ({ ...prev, email: false }));
          }}
          error={errors.email ? '회사 이메일 주소를 입력해 주세요.' : undefined}
          autoComplete="email"
        />
      </div>

      {/* 비밀번호 입력 */}
      <div>
        <label htmlFor="login-password" className="block text-label text-body font-semibold mb-2">
          비밀번호
        </label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors(prev => ({ ...prev, password: false }));
            }}
            error={errors.password ? '비밀번호가 일치하지 않습니다.' : undefined}
            autoComplete="current-password"
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

      {/* 로그인 상태 유지 & 비밀번호 찾기 */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer text-[13px]">
          <Checkbox defaultChecked />
          <span className="text-body">로그인 상태 유지</span>
        </label>
        <button
          type="button"
          className="text-[13px] text-body hover:text-text underline underline-offset-2 transition-colors"
        >
          비밀번호 찾기
        </button>
      </div>

      {/* 로그인 버튼 */}
      <Button type="submit" variant="primary" size="xl" className="w-full">
        로그인
      </Button>

      {/* 회원가입 링크 */}
      <p className="text-center text-[13px] text-body">
        아직 계정이 없으신가요?{' '}
        <button type="button" className="font-semibold text-text hover:underline">
          회원가입
        </button>
      </p>
    </form>
  );
}
