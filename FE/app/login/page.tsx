import { AuthLayout } from '@/components/auth-layout';

export const metadata = {
  title: 'OnboardOS — 로그인 / 회원가입',
  description: '계정에 로그인하거나 새로운 계정을 만들어 시작하세요',
};

export default function LoginPage() {
  return <AuthLayout />;
}
