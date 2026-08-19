import { AuthLayout } from '@/components/auth-layout';

export const metadata = {
  title: 'OnboardOS — 회원가입',
  description: '새로운 계정을 만들어 시작하세요',
};

export default function SignupPage() {
  return <AuthLayout initialTab="signup" />;
}
