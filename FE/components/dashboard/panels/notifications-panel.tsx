'use client';

import React, { useState } from 'react';
import {
  X,
  Bell,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Users,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import styles from './notifications-panel.module.css';

interface NotificationsPanelProps {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const [activeTab, setActiveTab] = useState('all');

  const notifications = [
    {
      id: 1,
      title: '오늘 할 일 마감 30분 전',
      message: '"행사운영가이드 .pdf 읽기" 마감이 30분 남았습니다.',
      time: '10:00',
      icon: Bell,
      unread: true,
    },
    {
      id: 2,
      title: '새 파일이 READY 상태가 되었습니다',
      message: '행사_예산안_v7.xlsx 파일이 READY 상태가 되었습니다.',
      time: '09:45',
      icon: BarChart3,
      unread: true,
    },
    {
      id: 3,
      title: 'AI 답변이 준비되었습니다',
      message: '"이 예산은 언제 사용합니까?" 질문에 대한 AI 답변이 준비되었습니다.',
      time: '09:30',
      icon: Sparkles,
      unread: true,
    },
    {
      id: 4,
      title: '체크리스트 항목이 완료되었습니다',
      message: '"거래처 연락망 확인하기" 항목이 완료되었습니다.',
      time: '09:15',
      icon: CheckCircle2,
      unread: false,
    },
    {
      id: 5,
      title: '새 구성원이 추가되었습니다',
      message: '이미현님이 마케팅팀에 추가되었습니다.',
      time: '08:40',
      icon: Users,
      unread: false,
    },
    {
      id: 6,
      title: 'AI 요약이 완료되었습니다',
      message: '행사운영가이드.pdf 파일의 요약이 완료되었습니다.',
      time: '08:20',
      icon: MessageSquare,
      unread: false,
    },
  ];

  const tabs = [
    { id: 'all', label: '전체' },
    { id: 'unread', label: '읽지 않음' },
    { id: 'read', label: '읽음' },
  ];

  const visible = notifications.filter((n) => {
    if (activeTab === 'unread') return n.unread;
    if (activeTab === 'read') return !n.unread;
    return true;
  });

  return (
    <>
      {/* 패널 밖을 클릭하면 닫히도록 하는 투명 배경 */}
      <div className={styles.backdrop} onClick={onClose} role="presentation" />

      <aside className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.panelTitle}>알림</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className={styles.tabs}>
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

        <div className={styles.notificationsList}>
          {visible.length > 0 ? (
            visible.map((notif) => {
              const Icon = notif.icon;
              return (
                <div key={notif.id} className={styles.notification}>
                  <span className={styles.icon}>
                    <Icon size={18} />
                  </span>
                  <div className={styles.content}>
                    <div className={styles.notifTitle}>{notif.title}</div>
                    <div className={styles.message}>{notif.message}</div>
                  </div>
                  <div className={styles.meta}>
                    <span className={styles.time}>{notif.time}</span>
                    {notif.unread && <span className={styles.dot} aria-label="읽지 않음" />}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.empty}>알림이 없습니다.</div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.moreBtn}>
            모든 알림 보기 <ChevronRight size={14} />
          </button>
        </div>
      </aside>
    </>
  );
}
