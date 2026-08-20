'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FileText, FileSpreadsheet, Cloud, ArrowRight, ChevronRight, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useToast } from './ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  formatDateTime,
  formatFileSize,
  formatFileType,
  getDashboard,
  getDocumentDetail,
  getDocuments,
  uploadDocument,
  type DashboardResponse,
  type DocumentResponse,
} from '@/lib/api';
import { FileDetailModal } from './file-detail-modal';
import styles from './home-dashboard.module.css';

interface HomeDashboardProps {
  /** 부모가 이미 받아 둔 대시보드가 있으면 그대로 쓴다 */
  data?: DashboardResponse | null;
  isLoading?: boolean;
  error?: string | null;
}

/** 화면의 3단 필터. 서버 priority 는 숫자라 구간으로 나눈다 */
type PriorityBucket = 'HIGH' | 'MEDIUM' | 'LOW';

function bucketOf(priority: number): PriorityBucket {
  if (priority <= 1) return 'HIGH';
  if (priority === 2) return 'MEDIUM';
  return 'LOW';
}

const BUCKET_LABEL: Record<PriorityBucket, string> = {
  HIGH: '긴급',
  MEDIUM: '중요',
  LOW: '일반',
};

export function HomeDashboard({ data, isLoading: isLoadingProp, error: errorProp }: HomeDashboardProps) {
  const { showToast } = useToast();
  const [priorityFilter, setPriorityFilter] = useState<PriorityBucket | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(data ?? null);
  const [files, setFiles] = useState<DocumentResponse[]>([]);
  const [documentTotal, setDocumentTotal] = useState(0);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DocumentResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(isLoadingProp ?? true);
  const [error, setError] = useState<string | null>(errorProp ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    const response = await getDocuments({ page: 0, size: 4 });
    setFiles(response.items ?? []);
    setDocumentTotal(response.totalElements ?? 0);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 부모가 준 대시보드가 있으면 파일만 받아 온다
      if (data) {
        setDashboard(data);
        await loadFiles();
      } else {
        const [dashboardData] = await Promise.all([getDashboard(), loadFiles()]);
        setDashboard(dashboardData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [data, loadFiles]);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleFileUpload(file);
  };

  const handleFileUpload = async (file: File) => {
    setUploadingFile(file.name);
    setUploadError(null);
    try {
      await uploadDocument({ file });
      await loadFiles();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '파일 업로드 실패');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleFileClick = async (file: DocumentResponse) => {
    setIsLoadingDetail(true);
    try {
      const detail = await getDocumentDetail(file.id);
      setSelectedFile(detail);
      setIsModalOpen(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '파일 정보를 불러올 수 없습니다.', 'error');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const todayTasks = (dashboard?.today.items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    action: item.source ? '열기' : '보기',
    priority: bucketOf(item.priority),
  }));

  const filteredTodayTasks = priorityFilter
    ? todayTasks.filter((task) => task.priority === priorityFilter)
    : todayTasks;

  const progressPercent = Math.round(Number(dashboard?.progressPercent ?? 0));
  const plan = dashboard?.plan ?? null;

  const stats = [
    { label: '전체 문서', value: String(documentTotal) },
    { label: '준비 완료', value: String(files.filter((f) => f.status === 'READY').length) },
    {
      label: '처리 중',
      value: String(files.filter((f) => f.status === 'PROCESSING' || f.status === 'PENDING').length),
    },
    { label: '체크리스트', value: `${dashboard?.checklist.done ?? 0}/${dashboard?.checklist.total ?? 0}` },
  ];

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

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* 좌측: 오늘 할 일 */}
        <div className={styles.leftColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>오늘 할 일 ({filteredTodayTasks.length})</h3>
              <div className={styles.filterGroup}>
                {(['HIGH', 'MEDIUM', 'LOW'] as PriorityBucket[]).map((priority) => (
                  <button
                    key={priority}
                    className={`${styles.filterBtn} ${priorityFilter === priority ? styles.active : ''}`}
                    onClick={() => setPriorityFilter(priorityFilter === priority ? null : priority)}
                  >
                    {BUCKET_LABEL[priority]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.tasksList}>
              {filteredTodayTasks.length === 0 ? (
                <div className={styles.taskItem}>
                  <div className={styles.taskContent}>
                    <span className={styles.taskTitle}>
                      {dashboard?.message || '오늘 할 일이 없습니다.'}
                    </span>
                  </div>
                </div>
              ) : (
                filteredTodayTasks.map((task) => (
                  <div key={task.id} className={`${styles.taskItem} ${styles[task.priority.toLowerCase()]}`}>
                    <input type="checkbox" className={styles.checkbox} readOnly />
                    <div className={styles.taskContent}>
                      <span className={styles.taskTitle}>{task.title}</span>
                      <span className={`${styles.priorityBadge} ${styles[`priority-${task.priority.toLowerCase()}`]}`}>
                        {BUCKET_LABEL[task.priority]}
                      </span>
                    </div>
                    <Link href="/daily-tasks" className={styles.taskAction}>{task.action}</Link>
                  </div>
                ))
              )}
            </div>

            <Link href="/daily-tasks" className={styles.seeAllTasks}>
              할 일 더 보기 <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        {/* 우측: 인수인계 진행률 */}
        <div className={styles.rightColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>인수인계 진행률</h3>
                {plan?.planId && (
                  <div className={styles.dayIndicator}>
                    <span className={styles.dayNumber}>
                      Day {plan.currentDay}/{plan.totalDays}
                    </span>
                  </div>
                )}
              </div>
              <Link href="/dashboard/progress" className={styles.seeMore}>
                전체 보기
              </Link>
            </div>

            <div className={styles.progressContent}>
              <div className={styles.progressChartContainer}>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={[
                        { value: progressPercent, name: '완료' },
                        { value: 100 - progressPercent, name: '남음' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                    >
                      <Cell fill="var(--accent)" />
                      <Cell fill="var(--surface-sunk)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.progressValueOverlay}>{progressPercent}%</div>
              </div>

              <div className={styles.statsGrid}>
                {stats.map((stat) => (
                  <div key={stat.label} className={styles.stat}>
                    <div className={styles.statValue}>{stat.value}</div>
                    <div className={styles.statLabel}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 분석 파일 */}
      <div className={styles.filesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>최근 분석 파일</h2>
          <Link href="/file-management" className={styles.seeAllLink}>
            전체 파일 보기
          </Link>
        </div>

        <div className={styles.filesGrid}>
          {files.slice(0, 3).map((file) => {
            const type = formatFileType(file.mimeType, file.title);
            return (
              <button
                key={file.id}
                className={styles.fileCard}
                onClick={() => void handleFileClick(file)}
                disabled={isLoadingDetail}
                type="button"
              >
                <div className={styles.fileIcon}>
                  {type === 'PDF' ? (
                    <FileText size={32} strokeWidth={1.5} />
                  ) : (
                    <FileSpreadsheet size={32} strokeWidth={1.5} />
                  )}
                </div>
                <h4 className={styles.fileName}>{file.title}</h4>
                <div className={styles.fileMeta}>
                  <span className={styles.fileType}>{getDisplayLabel(type)}</span>
                  <span className={`${styles.fileStatus} ${styles[`status-${file.status.toLowerCase()}`]}`}>
                    {getDisplayLabel(file.status)}
                  </span>
                </div>
                <p className={styles.fileDate}>{formatDateTime(file.updatedAt ?? file.createdAt)}</p>
                <div className={styles.fileDivider} />
                <div className={styles.fileFooter}>
                  <span className={styles.userInfo}>{formatFileSize(file.sizeBytes)}</span>
                  <span className={styles.fileLink}>상세 보기 <ArrowRight size={14} /></span>
                </div>
              </button>
            );
          })}
          <div className={styles.fileCard}>
            <div className={styles.uploadArea}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className={styles.fileInput}
                accept=".pdf,.xls,.xlsx,.doc,.docx"
              />
              <Cloud size={48} strokeWidth={1.5} />
              <div className={styles.uploadText}>
                {uploadingFile ? `업로드 중... ${uploadingFile}` : '파일 업로드'}
              </div>
              <div className={styles.uploadHint}>업무 자료를 업로드하면<br />인공지능이 분석하여 인수인계에 도움이 됩니다.</div>
              <button
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={!!uploadingFile}
              >
                {uploadingFile ? '업로드 중...' : '파일 선택'}
              </button>
              {uploadError && (
                <div className={styles.uploadError}>
                  <AlertCircle size={16} />
                  {uploadError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <FileDetailModal
        file={selectedFile}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFile(null);
        }}
        onRefresh={() => void loadFiles()}
      />
    </div>
  );
}
