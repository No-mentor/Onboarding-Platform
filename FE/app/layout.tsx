import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'OnboardOS',
  description: '신입·인수인계 담당자의 조직 적응을 인공지능이 설계·운영·분석하는 기업용 서비스',
};

// Next 16 부터 viewport 는 metadata 가 아니라 별도 export 로 내보낸다
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
