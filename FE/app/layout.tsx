import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OnboardOS',
  description: '신입·인수인계 담당자의 조직 적응을 AI가 설계·운영·분석하는 엔터프라이즈 SaaS',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
