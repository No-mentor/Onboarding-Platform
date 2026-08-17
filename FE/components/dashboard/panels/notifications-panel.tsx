'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './notifications-panel.module.css';

interface NotificationsPanelProps {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const [activeTab, setActiveTab] = useState('all');

  const notifications = [
    {
      id: 1,
      type: 'task',
      title: '오늘 할 일 미람 30분 전',
      message: '"행사운영가이드 .pdf 읽기" 미람이 30분 남았습니다.',
      time: '10:00',
      icon: '🔔',
    },
    {
      id: 2,
      type: 'status',
      title: '새 파일이 READY 상태가 되었습니다',
      message: '행사_예산안_v7.xlsx 파일이 READY 상태가 되었습니다.',
      time: '09:45',
      icon: '📊',
    },
    {
      id: 3,
      type: 'ai',
      title: 'AI 답변이 준비되었습니다',
      message: '"이 예산은 언제 사용합니까?" 질문에 대한 AI 답변이 준비되었습니다.',
      time: '09:30',
      icon: '✨',
    },
    {
      id: 4,
      type: 'progress',
      title: '체크리스트 항목이 완료되었습니다',
      message: '"거래처 연락망 확인하기" 항목이 완료되었습니다.',
      time: '09:15',
      icon: '✓',
    },
    {
      id: 5,
      type: 'member',
      title: '새 구성원이 추가되었습니다',
      message: '이미현님이 마케팅팀에 추가되었습니다.',
      time: '08:20',
      icon: '👥',
    },
    {
      id: 6,
      type: 'error',
      title: 'AI 요청이 완료되었습니다',
      message: '행사운영가이드.pdf 파일의 요청이 완료되었습니다.',
      time: '08:40',
      icon: '💬',
    },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>알림</h2>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            전체
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'unread' ? styles.active : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            읽지 않음
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'done' ? styles.active : ''}`}
            onClick={() => setActiveTab('done')}
          >
            모두 읽음
          </button>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className={styles.notificationsList}>
        {notifications.map((notif) => (
          <div key={notif.id} className={styles.notification}>
            <span className={styles.icon}>{notif.icon}</span>
            <div className={styles.content}>
              <div className={styles.title}>{notif.title}</div>
              <div className={styles.message}>{notif.message}</div>
            </div>
            <span className={styles.time}>{notif.time}</span>
            <span className={styles.dot}>●</span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button className={styles.moreBtn}>모든 알림 보기 ›</button>
      </div>
    </div>
  );
}
