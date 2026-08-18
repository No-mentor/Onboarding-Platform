import Image from 'next/image';
import { EmailVerificationForm } from '@/components/email-verification-form';

export const metadata = {
  title: 'OnboardOS — 이메일 인증',
  description: '가입 완료를 위해 이메일 인증 코드를 입력해주세요.',
};

export default function VerifyEmailPage() {
  return (
    <div className="auth">
      <aside className="brand">
        <div>
          <Image
            src="/logo.png"
            alt="OnboardOS Logo"
            width={64}
            height={64}
            className="logo"
          />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
          <span>OnboardOS</span>
        </div>

        <div className="brand-copy">
          <h1>거의 다 왔어요.</h1>
          <p>입력하신 이메일로 전송된 인증 코드를 입력하면 가입이 완료됩니다.</p>
        </div>

        <p className="brand-foot">© 2026 OnboardOS</p>
      </aside>

      <main className="pane">
        <div className="card">
          <EmailVerificationForm />
        </div>
      </main>
    </div>
  );
}
