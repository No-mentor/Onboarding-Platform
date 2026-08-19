'use client';

import React from 'react';
import { Bell, HelpCircle, ChevronDown } from 'lucide-react';
import styles from './top-header.module.css';

interface TopHeaderProps {
  userName?: string;
  workspaceName?: string;
}

export function TopHeader({ userName = '사용자님', workspaceName = '내 워크스페이스' }: TopHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.greeting}>환영합니다, {userName}</h1>
        <p className={styles.subtitle}>오늘의 업무와 인수인계 진행 상황을 한눈에 확인하세요.</p>
      </div>

      <div className={styles.right}>
        <div className={styles.workspace}>
          <span className={styles.label}>내 업무 공간:</span>
          <button className={styles.workspaceBtn}>
            {workspaceName}
            <ChevronDown size={16} strokeWidth={2} />
          </button>
        </div>

        <button className={styles.iconBtn} title="알림">
          <Bell size={20} strokeWidth={1.5} />
        </button>

        <button className={styles.iconBtn} title="도움말">
          <HelpCircle size={20} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
