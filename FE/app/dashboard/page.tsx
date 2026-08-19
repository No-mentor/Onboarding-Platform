'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { ChevronRight, Bell, HelpCircle } from 'lucide-react';
import { AiOutlineFilePdf, AiOutlineFileExcel, AiOutlineFile } from 'react-icons/ai';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { DailyTasksModal } from '@/components/dashboard/modals/daily-tasks-modal';
import { AllFilesModal } from '@/components/dashboard/modals/all-files-modal';
import { NotificationsPanel } from '@/components/dashboard/panels/notifications-panel';
import { RequireWorkspace, useMe } from '@/components/require-workspace';
import { useToast } from '@/components/ui/toast';
import { WorkspaceEmptyState } from '@/components/workspace-empty-state';
import {
  formatFileSize,
  formatFileType,
  getDashboard,
  getDocuments,
  sendChatMessage,
  type DashboardRecommendation,
  type DashboardResponse,
  type DocumentResponse,
} from '@/lib/api';
import styles from './dashboard.module.css';

function DashboardContent() {
  const me = useMe();
  const { showToast } = useToast();
  const userName = me?.name ?? '사용자';
  const workspaceName = me?.currentWorkspace?.name ?? '업무 공간';

  const [showDailyTasksModal, setShowDailyTasksModal] = useState(false);
  const [showAllFilesModal, setShowAllFilesModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Additional modal states
  const [isOnboardingProgressModalOpen, setIsOnboardingProgressModalOpen] = useState(false);
  const [isFileSummaryModalOpen, setIsFileSummaryModalOpen] = useState(false);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [isAIInquiryModalOpen, setIsAIInquiryModalOpen] = useState(false);
  const [isOnboardingSummaryModalOpen, setIsOnboardingSummaryModalOpen] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [recentFiles, setRecentFiles] = useState<DocumentResponse[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentResponse | null>(null);
  const [selectedTask, setSelectedTask] = useState<DashboardRecommendation | null>(null);

  // AI 질문
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayTasks = dashboard?.today.items ?? [];
  const plan = dashboard?.plan ?? null;
  const progressPercent = Math.round(Number(dashboard?.progressPercent ?? 0));

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 대시보드 집계와 최근 파일은 서로 다른 API 라 함께 받아 온다
      const [dashboardData, documents] = await Promise.all([
        getDashboard(),
        getDocuments({ page: 0, size: 4 }),
      ]);
      setDashboard(dashboardData);
      setRecentFiles(documents.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
      setDashboard(null);
      setRecentFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleAsk = async () => {
    const text = question.trim();
    if (!text) {
      setAskError('질문을 입력해 주세요.');
      return;
    }

    setIsAsking(true);
    setAskError(null);
    try {
      const result = await sendChatMessage(text);
      setAnswer(result.answer);
      if (result.permissionDeniedDocumentIds?.length) {
        showToast('일부 문서는 권한이 없어 답변에 사용되지 않았습니다.', 'error');
      }
    } catch (err) {
      setAskError(err instanceof Error ? err.message : '질문 전송에 실패했습니다.');
    } finally {
      setIsAsking(false);
    }
  };

  /** 파일/빠른질문 어느 쪽에서 열든 같은 상태로 시작한다 */
  const openAskModal = (prefill = '') => {
    setQuestion(prefill);
    setAnswer(null);
    setAskError(null);
    setIsAIInquiryModalOpen(true);
  };

  const getFileIcon = (mimeType?: string | null, title?: string) => {
    const type = formatFileType(mimeType, title);
    if (type === 'PDF') {
      return <AiOutlineFilePdf className={styles.fileTypeIcon} style={{ color: '#D1495A' }} />;
    }
    if (type === 'XLSX' || type === 'XLS' || type === 'CSV') {
      return <AiOutlineFileExcel className={styles.fileTypeIcon} style={{ color: '#207245' }} />;
    }
    return <AiOutlineFile className={styles.fileTypeIcon} />;
  };

  return (
    <div className={styles.layout}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>안녕하세요, {userName}님</h1>
          <div className={styles.headerRight}>
            <span className={styles.workspaceBtn}>{workspaceName}</span>
            <button className={styles.notifBtn} onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn}>
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
            <button type="button" onClick={() => void load()}>다시 시도</button>
          </div>
        )}

        {/* Content Grid */}
        <div className={styles.contentGrid}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            {/* Today's Tasks */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>오늘 할 일</h2>
                <span className={styles.count}>
                  {isLoading ? '—' : `${dashboard?.today.done ?? 0}/${dashboard?.today.total ?? 0}개`}
                </span>
              </div>
              <div className={styles.tasksList}>
                {isLoading ? (
                  <div className={styles.placeholder}>불러오는 중...</div>
                ) : todayTasks.length === 0 ? (
                  <div className={styles.placeholder}>
                    {dashboard?.message || '오늘 할 일이 없습니다.'}
                  </div>
                ) : (
                  todayTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className={styles.taskItem}
                      onClick={() => {
                        setSelectedTask(task);
                        setIsTaskDetailsModalOpen(true);
                      }}
                    >
                      <span className={`${styles.taskLabel} ${styles[`label_${task.type.toLowerCase()}`]}`}>{task.type}</span>
                      <span className={styles.taskTitle}>{task.title}</span>
                      <span className={styles.taskTime}>{task.source}</span>
                    </button>
                  ))
                )}
              </div>
              <button className={styles.viewAllBtn} onClick={() => setShowDailyTasksModal(true)}>
                오늘 할 일 전체 보기
                <ChevronRight size={16} />
              </button>
            </section>

            {/* Recent Files */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>최근 업무 파일</h2>
                <button className={styles.viewAllLink} onClick={() => setShowAllFilesModal(true)}>
                  전체 파일 보기
                </button>
              </div>
              <div className={styles.filesGrid}>
                {isLoading ? (
                  <div className={styles.placeholder}>불러오는 중...</div>
                ) : recentFiles.length === 0 ? (
                  <div className={styles.placeholder}>
                    아직 업로드된 파일이 없습니다. 파일을 올리면 AI가 내용을 학습합니다.
                  </div>
                ) : (
                  recentFiles.map((file) => (
                    <div key={file.id} className={styles.fileCard}>
                      <div className={styles.fileIcon}>{getFileIcon(file.mimeType, file.title)}</div>
                      <button
                        type="button"
                        className={styles.fileDetails}
                        onClick={() => {
                          setSelectedFile(file);
                          setIsFileSummaryModalOpen(true);
                        }}
                      >
                        <div className={styles.fileName}>{file.title}</div>
                        <div className={styles.fileSize}>
                          {formatFileType(file.mimeType, file.title)} · {formatFileSize(file.sizeBytes)}
                        </div>
                        <span className={styles.fileStatus}>{file.status}</span>
                      </button>
                      <button
                        className={styles.aiBtn}
                        onClick={() => {
                          setSelectedFile(file);
                          openAskModal(`${file.title} 문서에 대해 알려줘`);
                        }}
                      >
                        AI에게 질문
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className={styles.rightColumn}>
            {/* Progress Card */}
            <section className={styles.card}>
              <div className={styles.progressHeader}>
                <h2 className={styles.cardTitle}>인수인계 진행</h2>
                {plan && <span className={styles.bottleneck}>{plan.currentDay}일차 / {plan.totalDays}일</span>}
              </div>
              <div className={styles.progressNumber}>{progressPercent}%</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className={styles.progressStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>오늘 완료</span>
                  <span className={styles.statValue}>{dashboard?.today.done ?? 0}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>오늘 할 일</span>
                  <span className={styles.statValue}>{dashboard?.today.total ?? 0}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>체크리스트</span>
                  <span className={styles.statValue}>
                    {dashboard?.checklist.done ?? 0}/{dashboard?.checklist.total ?? 0}
                  </span>
                </div>
              </div>
            </section>

            {/* Quick Question */}
            <section className={styles.aiPanel}>
              <div className={styles.aiHeader}>
                빠른 질문
              </div>
              <p className={styles.aiDescription}>업무 파일을 바탕으로 바로 물어보세요.</p>
              <input
                type="text"
                placeholder='"이 예산은 언제 사용해?"'
                className={styles.aiInput}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && question.trim()) {
                    openAskModal(question);
                    void handleAsk();
                  }
                }}
              />
              <button
                className={styles.aiSubmitBtn}
                onClick={() => {
                  openAskModal(question);
                  if (question.trim()) void handleAsk();
                }}
              >
                AI에게 질문하기
              </button>
            </section>
          </div>
        </div>

        {/* Progress Section Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'center' }}>
          <button onClick={() => setIsOnboardingProgressModalOpen(true)} style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            진행도 보기
          </button>
          <button onClick={() => setIsOnboardingSummaryModalOpen(true)} style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            요약 정보
          </button>
        </div>
      </main>

      {/* Modals */}
      {showDailyTasksModal && (
        <DailyTasksModal
          onClose={() => setShowDailyTasksModal(false)}
          tasks={todayTasks}
          onCompleted={load}
          onShowDetail={(task) => {
            setSelectedTask(task);
            setIsTaskDetailsModalOpen(true);
          }}
        />
      )}
      {showAllFilesModal && (
        <AllFilesModal onClose={() => setShowAllFilesModal(false)} />
      )}
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}

      {/* 인수인계 진행도 */}
      <Modal
        open={isOnboardingProgressModalOpen}
        onClose={() => setIsOnboardingProgressModalOpen(false)}
        title="인수인계 진행도"
        footer={
          <ModalSecondaryButton onClick={() => setIsOnboardingProgressModalOpen(false)}>
            닫기
          </ModalSecondaryButton>
        }
      >
        <div className={styles.modalProgress}>
          <div className={styles.modalProgressValue}>{progressPercent}%</div>
          <div className={styles.modalProgressStats}>
            <div className={styles.modalStatItem}>오늘 할 일 {dashboard?.today.done ?? 0}/{dashboard?.today.total ?? 0}개</div>
            <div className={styles.modalStatItem}>체크리스트 {dashboard?.checklist.done ?? 0}/{dashboard?.checklist.total ?? 0}개</div>
            {plan && <div className={styles.modalStatItem}>{plan.currentDay}일차 / 전체 {plan.totalDays}일</div>}
          </div>
        </div>
      </Modal>

      {/* 파일 요약 */}
      <Modal
        open={isFileSummaryModalOpen && selectedFile !== null}
        onClose={() => setIsFileSummaryModalOpen(false)}
        title="파일 요약"
        footer={
          <ModalSecondaryButton onClick={() => setIsFileSummaryModalOpen(false)}>
            닫기
          </ModalSecondaryButton>
        }
      >
        {selectedFile && (
          <div className={styles.modalInfoCard}>
            <div className={styles.modalInfoTitle}>{selectedFile.title}</div>
            <div className={styles.modalInfoRow}>
              <span>형식</span>
              <span>{formatFileType(selectedFile.mimeType, selectedFile.title)}</span>
            </div>
            <div className={styles.modalInfoRow}>
              <span>크기</span>
              <span>{formatFileSize(selectedFile.sizeBytes)}</span>
            </div>
            <div className={styles.modalInfoRow}>
              <span>상태</span>
              <span>{selectedFile.status}</span>
            </div>
            {selectedFile.chunkCount !== null && selectedFile.chunkCount !== undefined && (
              <div className={styles.modalInfoRow}>
                <span>학습 조각</span>
                <span>{selectedFile.chunkCount}개</span>
              </div>
            )}
            {selectedFile.errorMessage && (
              <div className={styles.modalInfoRow}>
                <span>오류</span>
                <span>{selectedFile.errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 업무 상세 */}
      <Modal
        open={isTaskDetailsModalOpen && selectedTask !== null}
        onClose={() => setIsTaskDetailsModalOpen(false)}
        title="업무 상세"
        footer={
          <ModalSecondaryButton onClick={() => setIsTaskDetailsModalOpen(false)}>
            닫기
          </ModalSecondaryButton>
        }
      >
        {selectedTask && (
          <div className={styles.modalInfoCard}>
            <div className={styles.modalInfoTitle}>{selectedTask.title}</div>
            <div className={styles.modalInfoRow}>
              <span>구분</span>
              <span>{selectedTask.type}</span>
            </div>
            <div className={styles.modalInfoRow}>
              <span>상태</span>
              <span>{selectedTask.status}</span>
            </div>
            {selectedTask.source && (
              <div className={styles.modalInfoRow}>
                <span>출처</span>
                <span>{selectedTask.source}</span>
              </div>
            )}
            {selectedTask.personName && (
              <div className={styles.modalInfoRow}>
                <span>담당</span>
                <span>{selectedTask.personName}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* AI 질문 */}
      <Modal
        open={isAIInquiryModalOpen}
        onClose={() => setIsAIInquiryModalOpen(false)}
        title="AI에게 질문"
        subtitle="업무 파일을 바탕으로 답변합니다."
        closeOnBackdrop={!isAsking}
        footer={
          <>
            <ModalSecondaryButton onClick={() => setIsAIInquiryModalOpen(false)} disabled={isAsking}>
              닫기
            </ModalSecondaryButton>
            <ModalPrimaryButton onClick={() => void handleAsk()} loading={isAsking}>
              질문하기
            </ModalPrimaryButton>
          </>
        }
      >
        <input
          type="text"
          placeholder="질문을 입력하세요"
          className={styles.modalInput}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isAsking) void handleAsk();
          }}
          disabled={isAsking}
        />

        {askError && <p className={styles.askError}>{askError}</p>}

        {isAsking && <p className={styles.askStatus}>답변을 만드는 중입니다...</p>}

        {answer && !isAsking && (
          <div className={styles.answerBox}>
            <div className={styles.answerLabel}>답변</div>
            <p className={styles.answerText}>{answer}</p>
          </div>
        )}
      </Modal>

      {/* 인수인계 요약 */}
      <Modal
        open={isOnboardingSummaryModalOpen}
        onClose={() => setIsOnboardingSummaryModalOpen(false)}
        title="인수인계 요약"
        footer={
          <ModalSecondaryButton onClick={() => setIsOnboardingSummaryModalOpen(false)}>
            닫기
          </ModalSecondaryButton>
        }
      >
        <div className={styles.modalSection}>
          <h4>진행 현황</h4>
          <p>
            {progressPercent}% 완료 · 오늘 할 일 {dashboard?.today.total ?? 0}개 중{' '}
            {dashboard?.today.done ?? 0}개 완료
          </p>
        </div>
        <div className={styles.modalSection}>
          <h4>체크리스트</h4>
          <p>
            {dashboard?.checklist.total ?? 0}개 중 {dashboard?.checklist.done ?? 0}개 완료
          </p>
        </div>
        {dashboard?.message && (
          <div className={styles.modalSection}>
            <h4>안내</h4>
            <p>{dashboard.message}</p>
          </div>
        )}
      </Modal>

    </div>
  );
}

export default function DashboardPage() {
  // 워크스페이스가 없어도 튕겨내지 않고 빈 상태 화면을 보여준다
  return (
    <RequireWorkspace emptyState={<WorkspaceEmptyState />}>
      <DashboardContent />
    </RequireWorkspace>
  );
}
