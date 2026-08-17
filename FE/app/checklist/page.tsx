'use client';

import React, { useState } from 'react';
import { ChevronDown, RotateCcw, Bell, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import styles from './checklist.module.css';

export default function ChecklistPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [checkedItems, setCheckedItems] = useState<number[]>([1, 2]);

  const checklistItems = [
    {
      id: 1,
      title: '팀수 계정 및 권한 확인',
      day: 'DAY 1',
      status: 'complete',
      statusText: '완료',
      statusColor: '#10B981',
    },
    {
      id: 2,
      title: '주간의 자료 위치 파악',
      day: 'DAY 1',
      status: 'complete',
      statusText: '완료',
      statusColor: '#10B981',
    },
    {
      id: 3,
      title: '예산안 작성 규칙 확인',
      day: 'DAY 2',
      status: 'pending',
      statusText: '진행 중',
      statusColor: '#0066FF',
    },
    {
      id: 4,
      title: '거래처 연락망 최신화',
      day: 'DAY 3',
      status: 'pending',
      statusText: '대기',
      statusColor: '#9CA3AF',
    },
    {
      id: 5,
      title: '마케팅 결과 보고 템플릿 확인',
      day: 'DAY 4',
      status: 'pending',
      statusText: '대기',
      statusColor: '#9CA3AF',
    },
    {
      id: 6,
      title: '첫 주 인수인계 피드백 작성',
      day: 'DAY 5',
      status: 'pending',
      statusText: '대기',
      statusColor: '#9CA3AF',
    },
  ];

  const toggleCheck = (id: number) => {
    setCheckedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredItems = checklistItems.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return item.status === 'pending';
    if (activeTab === 'complete') return item.status === 'complete';
    return true;
  });

  return (
    <div className={styles.layout}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>내 체크리스트</h1>
            <p className={styles.subtitle}>상태별로 필터링하고 완료 여부를 바로 확인하세요.</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.workspaceBtn}>
              마케팅팀 인수인계
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn}>
              <Bell size={20} />
              <span className={styles.badge}>7</span>
            </button>
            <button className={styles.helpBtn}>
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {/* Tabs */}
          <div className={styles.tabsContainer}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('all')}
              >
                전체
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                대기
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'progress' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('progress')}
              >
                진행 중
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'complete' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('complete')}
              >
                완료
              </button>
            </div>

            <div className={styles.progressInfo}>
              <div className={styles.progressLabel}>완료율</div>
              <div className={styles.progressValue}>58%</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: '58%' }}></div>
              </div>
              <div className={styles.progressCount}>7 / 12 완료</div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>업무 체크리스트</h2>
            </div>

            <div className={styles.checklistContainer}>
              {filteredItems.map((item) => (
                <div key={item.id} className={styles.checklistItem}>
                  <div className={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      checked={checkedItems.includes(item.id)}
                      onChange={() => toggleCheck(item.id)}
                      className={styles.checkbox}
                    />
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.itemTitle}>{item.title}</div>
                  </div>
                  <div className={styles.itemDay}>{item.day}</div>
                  <div className={styles.itemStatus} style={{ color: item.statusColor }}>
                    {item.statusText}
                  </div>
                  <button className={styles.refreshBtn}>
                    <RotateCcw size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.footerText}>전체 12개 항목</span>
              <button className={styles.filterBtn}>
                Checklist filters
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
