'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { FileText, FileSpreadsheet, Cloud, ArrowRight, ChevronRight, Upload, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import styles from './home-dashboard.module.css';
import { uploadDocument, getDocuments, getDocument, DocumentResponse } from '@/lib/document';
import { FileDetailModal } from './file-detail-modal';

interface DashboardData {
  progressPercent: number;
  plan?: {
    currentDay: number;
    totalDays: number;
  };
  today?: {
    done: number;
    total: number;
    items: Array<{ id: string; title: string; description: string; priority: string }>;
  };
  checklist?: {
    done: number;
    total: number;
  };
  recentFiles?: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    date: string;
  }>;
  message?: string;
}

interface HomeDashboardProps {
  data?: DashboardData;
  isLoading?: boolean;
  error?: string | null;
  workspaceId?: string;
}

export function HomeDashboard({ data, isLoading = false, error = null, workspaceId = '' }: HomeDashboardProps) {
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [files, setFiles] = useState<DocumentResponse[]>([]);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DocumentResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileUpload(file);
  };

  const handleFileUpload = async (file: File) => {
    if (!workspaceId) {
      setUploadError('Workspace ID가 없습니다');
      return;
    }

    setUploadingFile(file.name);
    setUploadError(null);
    try {
      await uploadDocument(workspaceId, file);
      await loadFiles();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '파일 업로드 실패');
    } finally {
      setUploadingFile(null);
    }
  };

  const loadFiles = async () => {
    if (!workspaceId) return;
    try {
      const response = await getDocuments(workspaceId, 0, 4);
      setFiles(response.content || []);
    } catch (error) {
      console.error('파일 조회 실패:', error);
    }
  };

  const handleFileClick = async (file: DocumentResponse) => {
    setIsLoadingDetail(true);
    try {
      const detail = await getDocument(workspaceId, file.id);
      setSelectedFile(detail);
      setIsModalOpen(true);
    } catch (error) {
      console.error('파일 상세 조회 실패:', error);
      alert('파일 정보를 불러올 수 없습니다.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 기본값 데이터
  const defaultData = {
    progressPercent: 32,
    plan: { currentDay: 6, totalDays: 30 },
    todayTasks: [
      { id: '1', title: '행사 운영 매뉴얼(PDF) 읽기', action: '읽기', priority: 'HIGH' as const },
      { id: '2', title: '거래처별 연락망 확인하기', action: '확인', priority: 'MEDIUM' as const },
      { id: '3', title: '예산안 검토 및 가이드 숙지하기', action: '검토', priority: 'LOW' as const },
    ],
    stats: [
      { label: '전체 문서', value: '45' },
      { label: '완료', value: '14' },
      { label: '진행 중', value: '18' },
      { label: '대기 중', value: '13' },
    ],
  };

  // API 데이터가 있으면 사용, 없으면 기본값
  const dashboardData = data || { progressPercent: defaultData.progressPercent };
  const todayTasks = data?.today?.items?.map((item) => ({
    id: item.id,
    title: item.title,
    action: '보기',
    priority: (item.priority || 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
  })) || defaultData.todayTasks;

  const filteredTodayTasks = priorityFilter
    ? todayTasks.filter(task => task.priority === priorityFilter)
    : todayTasks;

  const stats = [
    { label: '전체 문서', value: data?.checklist?.total?.toString() || '45' },
    { label: '완료', value: data?.checklist?.done?.toString() || '14' },
    { label: '진행 중', value: ((data?.checklist?.total || 0) - (data?.checklist?.done || 0)).toString() },
    { label: '대기 중', value: ((data?.checklist?.total || 0) - (data?.checklist?.done || 0) - 5).toString() },
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
          <button onClick={() => window.location.reload()}>다시 시도</button>
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
                {['HIGH', 'MEDIUM', 'LOW'].map((priority) => (
                  <button
                    key={priority}
                    className={`${styles.filterBtn} ${priorityFilter === priority ? styles.active : ''}`}
                    onClick={() => setPriorityFilter(priorityFilter === priority ? null : priority)}
                  >
                    {priority === 'HIGH' ? '긴급' : priority === 'MEDIUM' ? '중요' : '일반'}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.tasksList}>
              {filteredTodayTasks.map((task) => (
                <div key={task.id} className={`${styles.taskItem} ${styles[task.priority.toLowerCase()]}`}>
                  <input type="checkbox" className={styles.checkbox} />
                  <div className={styles.taskContent}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <span className={`${styles.priorityBadge} ${styles[`priority-${task.priority.toLowerCase()}`]}`}>
                      {task.priority === 'HIGH' ? '긴급' : task.priority === 'MEDIUM' ? '중요' : '일반'}
                    </span>
                  </div>
                  <button className={styles.taskAction}>{task.action}</button>
                </div>
              ))}
            </div>

            <button className={styles.seeAllTasks}>
              할 일 더 보기 <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* 우측: 인수인계 진행률 */}
        <div className={styles.rightColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>인수인계 진행률</h3>
                {(data?.plan || defaultData.plan) && (
                  <div className={styles.dayIndicator}>
                    <span className={styles.dayNumber}>
                      Day {(data?.plan || defaultData.plan).currentDay}/{(data?.plan || defaultData.plan).totalDays}
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
                        { value: dashboardData.progressPercent, name: '완료' },
                        { value: 100 - dashboardData.progressPercent, name: '남음' },
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
                <div className={styles.progressValueOverlay}>{Math.round(dashboardData.progressPercent)}%</div>
              </div>

              <div className={styles.statsGrid}>
                {stats.map((stat, idx) => (
                  <div key={idx} className={styles.stat}>
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
          <Link href="/documents" className={styles.seeAllLink}>
            전체 파일 보기
          </Link>
        </div>

        <div className={styles.filesGrid}>
          {(data?.recentFiles || files).slice(0, 3).map((file) => (
            <button
              key={file.id}
              className={styles.fileCard}
              onClick={() => handleFileClick(file)}
              disabled={isLoadingDetail}
              type="button"
            >
              <div className={styles.fileIcon}>
                {file.type === 'PDF' ? (
                  <FileText size={32} strokeWidth={1.5} />
                ) : (
                  <FileSpreadsheet size={32} strokeWidth={1.5} />
                )}
              </div>
              <h4 className={styles.fileName}>{file.name}</h4>
              <div className={styles.fileMeta}>
                <span className={styles.fileType}>{file.type}</span>
                <span className={`${styles.fileStatus} ${styles[`status-${file.status?.toLowerCase()}`]}`}>
                  {file.status === 'READY' ? '준비됨' : file.status === 'PROCESSING' ? '분석중' : '대기중'}
                </span>
              </div>
              <p className={styles.fileDate}>{file.uploadedAt || file.date}</p>
              <div className={styles.fileDivider} />
              <div className={styles.fileFooter}>
                <span className={styles.userInfo}>{file.uploadedBy || '사용자'}</span>
                <span className={styles.fileLink}>상세 보기 <ArrowRight size={14} /></span>
              </div>
            </button>
          ))}
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
              <div className={styles.uploadHint}>업무 자료를 업로드하면<br />AI가 분석하여 인수인계에 도움이 됩니다.</div>
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
        workspaceId={workspaceId}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFile(null);
        }}
        onRefresh={loadFiles}
      />
    </div>
  );
}
