'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken, getWorkspaceId } from '@/lib/storage';
import { getProgressMe } from '@/lib/document';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import styles from './progress.module.css';

interface ProgressData {
  userId: string;
  progressPercent: number;
  completedDays: number;
  totalDays: number;
  bottlenecks: Array<{
    category: string;
    description: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  delayedItems: Array<{
    id: string;
    title: string;
    dueDate: string;
    daysOverdue: number;
  }>;
  completedCount: number;
  inProgressCount: number;
}

export default function ProgressPage() {
  const router = useRouter();
  const [data, setData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProgress() {
      try {
        const token = getAuthToken();
        const workspaceId = getWorkspaceId();

        if (!token || !workspaceId) {
          router.push('/login');
          return;
        }

        const progressData = await getProgressMe(workspaceId);
        setData(progressData);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '진행 현황 조회 실패';
        console.error('Progress error:', errorMsg);

        if (errorMsg.includes('401')) {
          router.push('/login');
          return;
        }

        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    }

    loadProgress();
  }, [router]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>다시 시도</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p>진행 현황 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn}>
          <ArrowLeft size={20} />
          대시보드로 돌아가기
        </Link>
        <h1 className={styles.title}>진행 현황</h1>
      </div>

      <div className={styles.content}>
        {/* 진행률 카드 */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>인수인계 진행률</h2>
          <div className={styles.progressOverview}>
            <div className={styles.progressCircle}>
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="var(--surface-sunk)"
                  strokeWidth="12"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="12"
                  strokeDasharray={`${(data.progressPercent / 100) * (2 * Math.PI * 90)} ${2 * Math.PI * 90}`}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '100px 100px' }}
                />
                <text
                  x="100"
                  y="110"
                  textAnchor="middle"
                  fontSize="48"
                  fontWeight="800"
                  fill="var(--text)"
                >
                  {Math.round(data.progressPercent)}%
                </text>
              </svg>
            </div>
            <div className={styles.progressStats}>
              <div className={styles.statBlock}>
                <div className={styles.statValue}>{data.completedDays}</div>
                <div className={styles.statLabel}>완료한 날</div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statValue}>{data.totalDays}</div>
                <div className={styles.statLabel}>총 기간</div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statValue}>{data.completedCount}</div>
                <div className={styles.statLabel}>완료한 항목</div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statValue}>{data.inProgressCount}</div>
                <div className={styles.statLabel}>진행 중</div>
              </div>
            </div>
          </div>
        </div>

        {/* 병목 현황 */}
        {data.bottlenecks && data.bottlenecks.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>병목 현황</h2>
            <div className={styles.itemsList}>
              {data.bottlenecks.map((item, idx) => (
                <div key={idx} className={`${styles.item} ${styles[`severity-${item.severity.toLowerCase()}`]}`}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemCategory}>{item.category}</span>
                    <span className={styles.itemSeverity}>
                      {item.severity === 'HIGH' ? '긴급' : item.severity === 'MEDIUM' ? '주의' : '일반'}
                    </span>
                  </div>
                  <p className={styles.itemDescription}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 지연 항목 */}
        {data.delayedItems && data.delayedItems.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>지연 항목</h2>
            <div className={styles.itemsList}>
              {data.delayedItems.map((item) => (
                <div key={item.id} className={styles.delayedItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.daysOverdue}>{item.daysOverdue}일 지연</span>
                  </div>
                  <p className={styles.itemDate}>예정일: {item.dueDate}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
