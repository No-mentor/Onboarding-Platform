'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { RequireWorkspace } from '@/components/require-workspace';
import { WorkspaceEmptyState } from '@/components/workspace-empty-state';
import { getMyProgress, type MyProgressResponse } from '@/lib/api';
import styles from './progress.module.css';

function ProgressContent() {
  const [data, setData] = useState<MyProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getMyProgress());
    } catch (err) {
      // 계획이 없으면 서버가 404 를 준다
      setError(err instanceof Error ? err.message : '진행 현황을 불러오지 못했습니다.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

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
          <button onClick={() => void load()}>다시 시도</button>
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

  const percent = Math.round(Number(data.progressPercent ?? 0));
  const remaining = Math.max(0, Number(data.totalItems ?? 0) - Number(data.completedItems ?? 0));
  const circumference = 2 * Math.PI * 90;

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
                <circle cx="100" cy="100" r="90" fill="none" stroke="var(--surface-sunk)" strokeWidth="12" />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="12"
                  strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '100px 100px' }}
                />
                <text x="100" y="110" textAnchor="middle" fontSize="48" fontWeight="800" fill="var(--text)">
                  {percent}%
                </text>
              </svg>
            </div>
            <div className={styles.progressStats}>
              <div className={styles.statBlock}>
                <div className={styles.statValue}>{data.completedItems}</div>
                <div className={styles.statLabel}>완료한 항목</div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statValue}>{data.totalItems}</div>
                <div className={styles.statLabel}>전체 항목</div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statValue}>{remaining}</div>
                <div className={styles.statLabel}>남은 항목</div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statValue}>{data.overdueItems.length}</div>
                <div className={styles.statLabel}>기한 경과</div>
              </div>
            </div>
          </div>
        </div>

        {/* 병목 현황 */}
        {data.bottlenecks.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>병목 현황</h2>
            <div className={styles.itemsList}>
              {data.bottlenecks.map((bottleneck) => {
                // 서버는 "문서 학습 미완료 5건" 형태로 준다. 유형과 건수를 나눠 보여 준다.
                const match = bottleneck.match(/^(.*?)\s*(\d+건)$/);
                return (
                  <div key={bottleneck} className={styles.item}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemCategory}>{match ? match[1] : '병목'}</span>
                      {match && <span className={styles.itemSeverity}>{match[2]}</span>}
                    </div>
                    <p className={styles.itemDescription}>{bottleneck}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 기한이 지난 항목 */}
        {data.overdueItems.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>기한이 지난 항목</h2>
            <div className={styles.itemsList}>
              {data.overdueItems.map((item) => (
                <div key={item.id} className={styles.delayedItem}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.daysOverdue}>{item.dayIndex}일차 항목</span>
                  </div>
                  <p className={styles.itemDate}>
                    예정 시점: {item.dayIndex}일차 (현재 {percent}% 진행)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <RequireWorkspace emptyState={<WorkspaceEmptyState />}>
      <ProgressContent />
    </RequireWorkspace>
  );
}
