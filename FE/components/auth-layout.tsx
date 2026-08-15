import React from 'react';
import { CheckCircle2, Calendar, Shield } from 'lucide-react';
import { AuthTabs } from './auth-tabs';

export function AuthLayout() {
  return (
    <div className="grid grid-cols-[460px_1fr] min-h-dvh lg:grid-cols-1">
      {/* 좌측 브랜드 패널 */}
      <aside className="bg-panel border-r border-border p-10 flex flex-col gap-10 lg:border-r-0 lg:border-b lg:p-7 lg:gap-5">
        {/* 로고 */}
        <div className="flex items-center gap-[10px]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-[26px] h-[26px] text-text"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
          <span className="text-[19px] font-bold leading-[1.38] -tracking-[0.02em] text-text">
            OnboardOS
          </span>
        </div>

        {/* 브랜드 메시지 */}
        <div className="lg:hidden">
          <h1 className="text-page-title text-text leading-[1.38]">
            첫날부터 무엇을<br />해야 할지 아는 상태로.
          </h1>
          <p className="mt-[14px] text-[14.5px] text-body leading-[1.72]">
            회사 문서를 읽고, 30일 인수인계 계획과 오늘 할 일을 먼저 제안합니다. 질문하기 전에 다음 할 일이 준비돼 있습니다.
          </p>
        </div>

        {/* 특징 목록 */}
        <ul className="flex flex-col gap-[14px] lg:hidden">
          <li className="flex gap-[11px] items-start text-[14px] text-body">
            <Calendar className="w-[17px] h-[17px] flex-none mt-[1px] text-muted" />
            <span>
              <b className="text-text font-semibold">30일 로드맵</b>이 역할·부서에 맞춰 자동으로 생성됩니다
            </span>
          </li>
          <li className="flex gap-[11px] items-start text-[14px] text-body">
            <CheckCircle2 className="w-[17px] h-[17px] flex-none mt-[1px] text-muted" />
            <span>
              <b className="text-text font-semibold">오늘 할 일</b>을 매일 아침 대시보드에서 확인합니다
            </span>
          </li>
          <li className="flex gap-[11px] items-start text-[14px] text-body">
            <Shield className="w-[17px] h-[17px] flex-none mt-[1px] text-muted" />
            <span>
              AI 답변에는 <b className="text-text font-semibold">출처와 권한 검증</b>이 함께 붙습니다
            </span>
          </li>
        </ul>

        {/* 미니 미리보기 */}
        <div className="mt-auto bg-surface border border-border rounded-[14px] p-[18px] shadow-card lg:hidden">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-label text-body font-semibold">인수인계 진행률</span>
            <em className="text-[11.5px] font-normal text-muted">최근 30일</em>
          </div>
          <div className="text-display text-text mt-[6px]">32%</div>
          <div className="h-[7px] rounded-full bg-surface-sunk mt-[10px] overflow-hidden">
            <div className="h-full w-[32%] rounded-full bg-primary" />
          </div>
          <div className="mt-4 border-t border-dashed border-border pt-[14px] flex flex-col gap-[11px]">
            <div className="flex items-center gap-[9px] text-[13px] text-body">
              <div className="w-[15px] h-[15px] rounded-[4px] bg-primary border border-primary flex items-center justify-center">
                <svg className="w-[4px] h-[8px] text-white" viewBox="0 0 6 10" fill="none">
                  <path d="M1 5l2 2 3-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="line-through text-muted">행사 운영 매뉴얼(PDF) 읽기</span>
            </div>
            <div className="flex items-center gap-[9px] text-[13px] text-body">
              <div className="w-[15px] h-[15px] rounded-[4px] border-[1.5px] border-border-strong" />
              <span>거래처별 연락망 확인하기</span>
            </div>
            <div className="flex items-center gap-[9px] text-[13px] text-body">
              <div className="w-[15px] h-[15px] rounded-[4px] border-[1.5px] border-border-strong" />
              <span>예산안 검토 및 가이드 숙지하기</span>
            </div>
          </div>
        </div>

        <p className="text-[12px] text-muted lg:hidden">© 2026 OnboardOS</p>
      </aside>

      {/* 우측 폼 영역 */}
      <main className="flex items-center justify-center p-12 lg:p-7 lg:items-start">
        <div className="w-full max-w-[396px]">
          <AuthTabs />
        </div>
      </main>
    </div>
  );
}
