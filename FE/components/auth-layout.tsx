'use client';

import React from 'react';
import Image from 'next/image';
import { AuthTabs } from './auth-tabs';

export function AuthLayout({ initialTab = 'login' }: { initialTab?: 'login' | 'signup' }) {
  return (
    <div className="auth">
      <aside className="brand">
        <div className="logo">
          <Image
            src="/logo.png"
            alt="OnboardOS Logo"
            width={80}
            height={80}
            priority
          />
          <span>OnboardOS</span>
        </div>

        <div className="brand-copy">
          <h1>첫날부터 무엇을<br />해야 할지 아는 상태로.</h1>
          <p>회사 문서를 읽고, 30일 인수인계 계획과 오늘 할 일을 먼저 제안합니다. 질문하기 전에 다음 할 일이 준비돼 있습니다.</p>
        </div>

        <ul className="points">
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span><b>30일 로드맵</b>이 역할·부서에 맞춰 자동으로 생성됩니다</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span><b>오늘 할 일</b>을 매일 아침 대시보드에서 확인합니다</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>AI 답변에는 <b>출처와 권한 검증</b>이 함께 붙습니다</span>
          </li>
        </ul>

        <div className="peek">
          <div className="peek-head">
            <span>인수인계 진행률</span>
            <em>최근 30일</em>
          </div>
          <div className="peek-num">32%</div>
          <div className="track">
            <div className="fill" />
          </div>
          <div className="peek-list">
            <div className="peek-row done">
              <i className="box on" />
              <span>행사 운영 매뉴얼(PDF) 읽기</span>
            </div>
            <div className="peek-row">
              <i className="box" />
              <span>거래처별 연락망 확인하기</span>
            </div>
            <div className="peek-row">
              <i className="box" />
              <span>예산안 검토 및 가이드 숙지하기</span>
            </div>
          </div>
        </div>

        <p className="brand-foot">© 2026 OnboardOS</p>
      </aside>

      <main className="pane">
        <div className="card">
          <AuthTabs initialTab={initialTab} />
        </div>
      </main>
    </div>
  );
}
