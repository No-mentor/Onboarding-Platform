'use client';

import React, { useState } from 'react';
import { Plus, Zap, Bell, HelpCircle, Check } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import styles from './30day-plan.module.css';

export default function ThirtyDayPlanPage() {
  const [selectedTab, setSelectedTab] = useState('all');
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);

  const days = [
    { day: 1, title: '업무 이해 및 환경 셋업', progress: 25, items: { docs: 2, checklists: 2, practice: 0 }, completed: true },
    { day: 2, title: '핵심 업무 프로세스 학습', progress: 40, items: { docs: 2, checklists: 3, practice: 0 }, completed: false },
    { day: 3, title: '주요 프로젝트 및 자료 파악', progress: 30, items: { docs: 3, checklists: 2, practice: 1 }, completed: false },
    { day: 30, title: '인수인계 완료 및 향후 계획', progress: 0, items: { docs: 1, checklists: 2, practice: 0 }, completed: false },
  ];

  const toggleDayExpanded = (day: number) => {
    setExpandedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className={styles.container}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>30 일 인수인계 계획</h1>
            <p className={styles.description}>AI 가 생성한 계획을 원자재 확인하고 향후 상태를 관리하세요.</p>
          </div>
          <div className={styles.headerRight}>
            <select className={styles.workspaceBtn}>
              <option>마케팅팀 인수인계</option>
            </select>
            <button className={styles.notifBtn}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn}>
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        <div className={styles.contentArea}>
          {/* Tabs */}
          <div className={styles.tabsBar}>
            <div className={styles.tabs}>
              {['all', '1week', '2week', '3week', '4week'].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${selectedTab === tab ? styles.activeTab : ''}`}
                  onClick={() => setSelectedTab(tab)}
                >
                  {tab === 'all' ? '전체 30 일' : tab === '1week' ? '1 주차' : tab === '2week' ? '2 주차' : tab === '3week' ? '3 주차' : '4 주차'}
                </button>
              ))}
            </div>
            <div className={styles.tabActions}>
              <button className={styles.refreshBtn}>계획 재생성</button>
              <button className={styles.createBtn}>
                <Plus size={16} /> 계획 생성
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.timeline}>
            {days.map((item, idx) => {
              const isExpanded = expandedDays.includes(item.day);
              return (
                <div key={item.day} className={styles.timelineItem}>
                  <div className={styles.timelineMarker}>
                    <div className={`${styles.dot} ${item.completed ? styles.completed : ''}`}>
                      {item.completed && <Check size={14} className={styles.checkmark} />}
                    </div>
                    {idx < days.length - 1 && <div className={styles.line} />}
                  </div>

                  <div className={styles.content}>
                    <div
                      className={styles.contentHeader}
                      onClick={() => toggleDayExpanded(item.day)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className={styles.dayLabel}>DAY {item.day}</span>
                      <h3 className={styles.dayTitle}>{item.title}</h3>
                    </div>

                    {isExpanded && (
                      <div className={styles.dayItems}>
                        {item.items.docs > 0 && <span>문서 {item.items.docs}</span>}
                        {item.items.checklists > 0 && <span>체크리스트 {item.items.checklists}</span>}
                        {item.items.practice > 0 && <span>실습 {item.items.practice}</span>}
                      </div>
                    )}

                    <div className={styles.progressArea}>
                      <span className={styles.progressPercent}>{item.progress}%</span>
                      <button
                        className={styles.expandBtn}
                        onClick={() => toggleDayExpanded(item.day)}
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease'
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className={styles.footerInfo}>
            <div className={styles.infoItem}>
              <span>관리자는 항목 완료 (keepCompleted) 를 선택해</span>
            </div>
            <div className={styles.infoItem}>
              <span>계획을 재생성할 수 있습니다.</span>
            </div>
          </div>

          {/* Generate Button */}
          <button className={styles.generateBtn}>
            <Zap size={16} /> Generate / Regenerate
          </button>
        </div>
      </main>
    </div>
  );
}
