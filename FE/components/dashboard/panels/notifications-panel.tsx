'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Bell,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  getDocuments,
  getMyProgress,
  type DocumentResponse,
  type MyProgressResponse,
} from '@/lib/api';
import styles from './notifications-panel.module.css';

interface NotificationsPanelProps {
  onClose: () => void;
}

type NotificationIcon = typeof Bell;

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  /** 정렬/표시용 시각. 알 수 없으면 null */
  at: string | null;
  icon: NotificationIcon;
  unread: boolean;
}

/**
 * 서버에는 알림 API 가 없다.
 * 대신 실제로 알려야 하는 상태(기한이 지난 할 일 · 병목 · 파일 처리 결과)를
 * 진행 현황과 문서 목록에서 뽑아 알림 목록으로 만든다.
 */
function buildNotifications(
  progress: MyProgressResponse | null,
  documents: DocumentResponse[]
): NotificationItem[] {
  const items: NotificationItem[] = [];

  for (const overdue of progress?.overdueItems ?? []) {
    items.push({
      id: `overdue-${overdue.id}`,
      title: '기한이 지난 할 일이 있습니다',
      message: `"${overdue.title}" 은 ${overdue.dayIndex}일차 항목입니다.`,
      at: null,
      icon: Clock,
      unread: true,
    });
  }

  for (const [index, bottleneck] of (progress?.bottlenecks ?? []).entries()) {
    items.push({
      id: `bottleneck-${index}`,
      title: '진행이 막힌 지점이 있습니다',
      message: bottleneck,
      at: null,
      icon: BarChart3,
      unread: true,
    });
  }

  for (const doc of documents) {
    const at = doc.updatedAt ?? doc.createdAt ?? null;
    if (doc.status === 'READY') {
      items.push({
        id: `doc-${doc.id}`,
        title: '새 파일이 준비 완료되었습니다',
        message: `${doc.title} 파일을 AI 답변에 사용할 수 있습니다.`,
        at,
        icon: CheckCircle2,
        unread: false,
      });
    } else if (doc.status === 'FAILED') {
      items.push({
        id: `doc-${doc.id}`,
        title: '파일 처리에 실패했습니다',
        message: doc.errorMessage
          ? `${doc.title}: ${doc.errorMessage}`
          : `${doc.title} 파일을 다시 처리해 주세요.`,
        at,
        icon: AlertTriangle,
        unread: true,
      });
    } else {
      items.push({
        id: `doc-${doc.id}`,
        title: '파일을 처리하고 있습니다',
        message: `${doc.title} 파일의 학습이 끝나면 AI 답변에 사용됩니다.`,
        at,
        icon: Bell,
        unread: false,
      });
    }
  }

  return items;
}

/** 알림 목록. 벨 아이콘의 개수 표시와 패널이 같은 값을 쓰도록 훅으로 뺐다 */
export function useNotifications(): {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
} {
  const [progress, setProgress] = useState<MyProgressResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [progressData, documentPage] = await Promise.all([
        getMyProgress(),
        getDocuments({ page: 0, size: 10 }),
      ]);
      setProgress(progressData);
      setDocuments(documentPage.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알림을 불러오지 못했습니다.');
      setProgress(null);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const notifications = useMemo(() => buildNotifications(progress, documents), [progress, documents]);
  const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications]);

  return { notifications, unreadCount, isLoading, error, reload };
}

/** 서버가 주는 시각을 알림 목록에 쓸 짧은 형식으로 */
function formatAt(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const [activeTab, setActiveTab] = useState('all');
  const { notifications, isLoading, error, reload } = useNotifications();

  const tabs = [
    { id: 'all', label: '전체' },
    { id: 'unread', label: '읽지 않음' },
    { id: 'read', label: '읽음' },
  ];

  const visible = notifications.filter(n => {
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
          {tabs.map(tab => (
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
          {isLoading ? (
            <div className={styles.empty}>불러오는 중...</div>
          ) : error ? (
            <div className={styles.empty}>
              {error}
              <br />
              <button className={styles.moreBtn} onClick={() => void reload()}>
                다시 시도
              </button>
            </div>
          ) : visible.length > 0 ? (
            visible.map(notif => {
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
                    <span className={styles.time}>{formatAt(notif.at)}</span>
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
          <Link href="/notification-center" className={styles.moreBtn} onClick={onClose}>
            모든 알림 보기 <ChevronRight size={14} />
          </Link>
        </div>
      </aside>
    </>
  );
}
