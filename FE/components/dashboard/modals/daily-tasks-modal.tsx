'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
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
      title: '행사운영가이드 .pdf 읽기',
      time: '10:30 가치',
      description: '행사 진행 흐름은 운영 정책을 확인하고 핵시 내용을 정리해요.',
      details: [
        { label: '상태 보기', icon: '👁️' },
        { label: '완료', icon: '✓' },
      ],
    },
    {
      id: 2,
      category: '체크',
      title: '거래처 연락망 확인하기',
      time: '14:00 가치',
      description: '주요 거래처 담당자의 정보와 연락처 최신 확인하기',
      details: [
        { label: '상태 보기', icon: '👁️' },
        { label: '완료', icon: '✓' },
      ],
    },
    {
      id: 3,
      category: '심습',
      title: '예산안 설물 업데이트',
      time: '16:00 가치',
      description: '예산안 설물의 최신 원본을 검토하여 정확하게 완료했으세요.',
      details: [
        { label: '상태 보기', icon: '👁️' },
        { label: '완료', icon: '✓' },
      ],
    },
  ];

  const tabs = [
    { id: 'all', label: '전체', color: '#E3F2FD' },
    { id: 'document', label: '문서', color: '#E3F2FD' },
    { id: 'checklist', label: '체크', color: '#E0F2F1' },
    { id: 'meeting', label: '심습', color: '#FFF3E0' },
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>오늘 할 일 전체 보기</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.tabsContainer}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? { backgroundColor: tab.color } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.tasksList}>
          {tasks.map((task) => (
            <div key={task.id} className={styles.taskRow}>
              <div className={styles.taskCategory}>{task.category}</div>
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
          ))}
        </div>

        <div className={styles.note}>
          작업을 완료하면 진행률이 자동으로 업데이트됩니다.
        </div>
      </div>
    </div>
  );
}
