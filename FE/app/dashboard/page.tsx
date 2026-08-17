'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Bell, HelpCircle } from 'lucide-react';
import { AiOutlineFilePdf, AiOutlineFileExcel, AiOutlineFile } from 'react-icons/ai';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { DailyTasksModal } from '@/components/dashboard/modals/daily-tasks-modal';
import { AllFilesModal } from '@/components/dashboard/modals/all-files-modal';
import { NotificationsPanel } from '@/components/dashboard/panels/notifications-panel';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const [showDailyTasksModal, setShowDailyTasksModal] = useState(false);
  const [showAllFilesModal, setShowAllFilesModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Additional modal states
  const [isOnboardingProgressModalOpen, setIsOnboardingProgressModalOpen] = useState(false);
  const [isFileSummaryModalOpen, setIsFileSummaryModalOpen] = useState(false);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [isAIInquiryModalOpen, setIsAIInquiryModalOpen] = useState(false);
  const [isBudgetInquiryModalOpen, setIsBudgetInquiryModalOpen] = useState(false);
  const [isOnboardingSummaryModalOpen, setIsOnboardingSummaryModalOpen] = useState(false);
  const [isRecentFilesModalOpen, setIsRecentFilesModalOpen] = useState(false);

  const [selectedFile, setSelectedFile] = useState<typeof recentFiles[0] | null>(null);
  const [selectedTask, setSelectedTask] = useState<typeof todayTasks[0] | null>(null);

  const todayTasks = [
    {
      id: 1,
      label: '문서',
      title: '행사운영가이드 .pdf 읽기',
      time: '10:30 가치',
    },
    {
      id: 2,
      label: '체크',
      title: '거래처 연락망 확인하기',
      time: '14:00 가치',
    },
    {
      id: 3,
      label: '실습',
      title: '예산안 설물 업데이트',
      time: '16:00 가치',
    },
  ];

  const recentFiles = [
    {
      id: 1,
      name: '행사운영가이드 .pdf',
      size: '5.8MB',
      format: 'PDF',
      status: 'READY',
      type: 'pdf',
    },
    {
      id: 2,
      name: '행사_예산안_v7.xlsx',
      size: '2.4MB',
      format: 'XLSX',
      status: 'READY',
      type: 'excel',
    },
    {
      id: 3,
      name: '거래처_연락망.xlsx',
      size: '1.6MB',
      format: 'XLSX',
      status: 'READY',
      type: 'excel',
    },
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <AiOutlineFilePdf className={styles.fileTypeIcon} style={{ color: '#D1495A' }} />;
      case 'excel':
        return <AiOutlineFileExcel className={styles.fileTypeIcon} style={{ color: '#207245' }} />;
      default:
        return <AiOutlineFile className={styles.fileTypeIcon} />;
    }
  };

  return (
    <div className={styles.layout}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>안녕하세요, 김세원님</h1>
          <div className={styles.headerRight}>
            <button className={styles.workspaceBtn}>
              마케팅팀 인수인계
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={20} />
              <span className={styles.badge}>7</span>
            </button>
            <button className={styles.helpBtn}>
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Content Grid */}
        <div className={styles.contentGrid}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            {/* Today's Tasks */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>오늘 할 일</h2>
                <span className={styles.count}>3개</span>
              </div>
              <div className={styles.tasksList}>
                {todayTasks.map((task) => (
                  <div key={task.id} className={styles.taskItem}>
                    <span className={`${styles.taskLabel} ${styles[`label_${task.label}`]}`}>{task.label}</span>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <span className={styles.taskTime}>{task.time}</span>
                  </div>
                ))}
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
                {recentFiles.map((file) => (
                  <div key={file.id} className={styles.fileCard}>
                    <div className={styles.fileIcon}>{getFileIcon(file.type)}</div>
                    <div className={styles.fileDetails}>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileSize}>{file.format} · {file.size}</div>
                      <span className={styles.fileStatus}>{file.status}</span>
                    </div>
                    <button
                      className={styles.aiBtn}
                      onClick={() => {
                        setSelectedFile(file);
                        setIsAIInquiryModalOpen(true);
                      }}
                    >
                      AI에게 질문
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className={styles.rightColumn}>
            {/* Progress Card */}
            <section className={styles.card}>
              <div className={styles.progressHeader}>
                <h2 className={styles.cardTitle}>인수인계 진행</h2>
                <span className={styles.bottleneck}>병목 2건</span>
              </div>
              <div className={styles.progressNumber}>32%</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill}></div>
              </div>
              <div className={styles.progressStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>완료</span>
                  <span className={styles.statValue}>14</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>진행</span>
                  <span className={styles.statValue}>18</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>대기</span>
                  <span className={styles.statValue}>13</span>
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
              />
              <button className={styles.aiSubmitBtn} onClick={() => setIsAIInquiryModalOpen(true)}>
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
        <DailyTasksModal onClose={() => setShowDailyTasksModal(false)} />
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
          <div className={styles.modalProgressValue}>32%</div>
          <div className={styles.modalProgressStats}>
            <div className={styles.modalStatItem}>완료 14개</div>
            <div className={styles.modalStatItem}>진행 18개</div>
            <div className={styles.modalStatItem}>대기 13개</div>
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
            <div className={styles.modalInfoTitle}>{selectedFile.name}</div>
            <div className={styles.modalInfoRow}>
              <span>형식</span>
              <span>{selectedFile.format}</span>
            </div>
            <div className={styles.modalInfoRow}>
              <span>크기</span>
              <span>{selectedFile.size}</span>
            </div>
            <div className={styles.modalInfoRow}>
              <span>상태</span>
              <span>{selectedFile.status}</span>
            </div>
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
              <span>{selectedTask.label}</span>
            </div>
            <div className={styles.modalInfoRow}>
              <span>마감</span>
              <span>{selectedTask.time}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* AI 질문 */}
      <Modal
        open={isAIInquiryModalOpen}
        onClose={() => setIsAIInquiryModalOpen(false)}
        title="AI에게 질문"
        subtitle="업무 파일을 바탕으로 답변합니다."
        footer={
          <>
            <ModalSecondaryButton onClick={() => setIsAIInquiryModalOpen(false)}>
              취소
            </ModalSecondaryButton>
            <ModalPrimaryButton>질문하기</ModalPrimaryButton>
          </>
        }
      >
        <input type="text" placeholder="질문을 입력하세요" className={styles.modalInput} />
      </Modal>

      {/* 예산 조회 */}
      <Modal
        open={isBudgetInquiryModalOpen}
        onClose={() => setIsBudgetInquiryModalOpen(false)}
        title="예산 조회"
        footer={
          <ModalSecondaryButton onClick={() => setIsBudgetInquiryModalOpen(false)}>
            닫기
          </ModalSecondaryButton>
        }
      >
        <div className={styles.modalInfoCard}>
          <div className={styles.modalInfoRow}>
            <span>배정 예산</span>
            <span>$5,000</span>
          </div>
          <div className={styles.modalInfoRow}>
            <span>사용액</span>
            <span>$1,200</span>
          </div>
          <div className={styles.modalInfoRow}>
            <span>잔액</span>
            <span>$3,800</span>
          </div>
        </div>
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
          <p>32% 완료 · 45개 업무 중 14개 완료</p>
        </div>
        <div className={styles.modalSection}>
          <h4>병목 항목</h4>
          <p>2건의 지연 항목이 있습니다.</p>
        </div>
      </Modal>

      {/* 최근 파일 */}
      <Modal
        open={isRecentFilesModalOpen}
        onClose={() => setIsRecentFilesModalOpen(false)}
        title="최근 파일"
        footer={
          <ModalSecondaryButton onClick={() => setIsRecentFilesModalOpen(false)}>
            닫기
          </ModalSecondaryButton>
        }
      >
        <div className={styles.modalList}>
          {recentFiles.map((file) => (
            <div key={file.id} className={styles.modalListItem}>
              <span>{file.name}</span>
              <span className={styles.modalListMeta}>
                {file.format} · {file.size}
              </span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
