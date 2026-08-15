export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-canvas">
      <div className="text-center">
        <h1 className="text-page-title text-text mb-4">OnboardOS</h1>
        <p className="text-body text-body mb-8">
          토큰 세팅 및 디자인 시스템 구축 중입니다.
        </p>
        <a
          href="/login"
          className="btn-primary"
        >
          로그인으로 이동
        </a>
      </div>
    </main>
  );
}
