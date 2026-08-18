'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import styles from './daily-tasks-modal.module.css';

interface DailyTasksModalProps {
  onClose: () => void;
}

export function DailyTasksModal({ onClose }: DailyTasksModalProps) {
  const [activeTab, setActiveTab] = useState('all');

  const tasks = [
    {
      id: 1,
      category: '문서',
      type: 'document',
      title: '행사운영가이드 .pdf 읽기',
      time: '10:30 까지',
      description: '행사 진행 흐름과 운영 정책을 확인하고 핵심 내용을 정리해요.',
    },
    {
      id: 2,
      category: '체크',
      type: 'checklist',
      title: '거래처 연락망 확인하기',
      time: '14:00 까지',
      description: '주요 거래처 담당자의 정보와 연락처를 최신으로 확인하기',
    },
    {
      id: 3,
      category: '실습',
      type: 'practice',
      title: '예산안 샘플 업데이트',
      time: '16:00 까지',
      description: '예산안 샘플의 최신 원본을 검토하여 정확하게 반영해요.',
    },
  ];

  const tabs = [
    { id: 'all', label: '전체' },
    { id: 'document', label: '문서' },
    { id: 'checklist', label: '체크' },
    { id: 'practice', label: '실습' },
  ];

  const visibleTasks = activeTab === 'all' ? tasks : tasks.filter((t) => t.type === activeTab);

  const categoryClass = (type: string) => {
    if (type === 'document') return styles.catDocument;
    if (type === 'checklist') return styles.catChecklist;
    return styles.catPractice;
  };

  return (
    <Modal open onClose={onClose} title="오늘 할 일 전체 보기" size="lg">
      <div className={styles.tabsContainer}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tasksList}>
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <div key={task.id} className={styles.taskRow}>
              <div className={`${styles.taskCategory} ${categoryClass(task.type)}`}>
                {task.category}
              </div>
              <div className={styles.taskContent}>
                <h3 className={styles.taskTitle}>{task.title}</h3>
                <p className={styles.taskDesc}>{task.description}</p>
              </div>
              <div className={styles.taskTime}>{task.time}</div>
              <div className={styles.taskActions}>
                <button className={styles.actionBtnSecondary}>상세 보기</button>
                <button className={styles.actionBtnPrimary}>완료</button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>해당 조건의 할 일이 없습니다.</div>
        )}
      </div>

      <div className={styles.note}>작업을 완료하면 진행률이 자동으로 업데이트됩니다.</div>
    </Modal>
  );
}
