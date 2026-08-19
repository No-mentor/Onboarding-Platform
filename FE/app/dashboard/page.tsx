'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, Bell, HelpCircle, Building2, Settings, Check } from 'lucide-react';
import { AiOutlineFilePdf, AiOutlineFileExcel, AiOutlineFile } from 'react-icons/ai';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { DailyTasksModal } from '@/components/dashboard/modals/daily-tasks-modal';
import { AllFilesModal } from '@/components/dashboard/modals/all-files-modal';
import { NotificationsPanel } from '@/components/dashboard/panels/notifications-panel';
import { getUserName } from '@/lib/storage';
import { getDisplayLabel } from '@/lib/display-labels';
import styles from './dashboard.module.css';

const MOCK_TODAY_TASKS = [
  { id: 'mock-task-1', type: 'DOCUMENT', title: '[목업] 행사운영가이드.pdf 읽기', status: 'PENDING', priority: 1, source: '[목업] 행사운영가이드.pdf', planItemId: 'mock-plan-1', documentId: 'mock-doc-1', personName: '김세원' },
  { id: 'mock-task-2', type: 'CHECKLIST', title: '거래처 연락망 확인하기', status: 'IN_PROGRESS', priority: 2, source: '[목업] 거래처_연락망.xlsx', planItemId: 'mock-plan-2', documentId: 'mock-doc-2', personName: '김세원' },
  { id: 'mock-task-3', type: 'PRACTICE', title: '예산안 샘플 업데이트', status: 'PENDING', priority: 3, source: '[목업] 행사_예산안_v7.xlsx', planItemId: 'mock-plan-3', documentId: 'mock-doc-3', personName: '김세원' },
];

const MOCK_RECENT_FILES = [
  { id: 'mock-file-1', name: '[목업] 행사운영가이드.pdf', size: '5.8MB', format: 'PDF', status: 'READY', type: 'pdf', updatedAt: '2026.08.16 18:21', relatedTask: '행사 운영 절차 확인' },
  { id: 'mock-file-2', name: '[목업] 행사_예산안_v7.xlsx', size: '2.4MB', format: 'XLSX', status: 'READY', type: 'excel', updatedAt: '2026.08.16 18:18', relatedTask: '예산안 샘플 업데이트' },
  { id: 'mock-file-3', name: '[목업] 거래처_연락망.xlsx', size: '1.6MB', format: 'XLSX', status: 'READY', type: 'excel', updatedAt: '2026.08.16 18:13', relatedTask: '거래처 연락망 확인하기' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [showDailyTasksModal, setShowDailyTasksModal] = useState(false);
  const [userName, setUserName] = useState<string>('김세원');
  const [quickQuestion, setQuickQuestion] = useState<string>('');
  const [showAllFilesModal, setShowAllFilesModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('마케팅팀 인수인계');

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

  const [todayTasks] = useState(MOCK_TODAY_TASKS);
  const [recentFiles] = useState(MOCK_RECENT_FILES);

  useEffect(() => {
    const name = getUserName();
    if (name) {
      setUserName(name);
    }
  }, []);

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

  const getTaskFileIcon = (source: string) => {
    const fileName = source.toLowerCase();
    if (fileName.endsWith('.pdf')) {
      return <AiOutlineFilePdf aria-hidden="true" />;
    }
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return <AiOutlineFileExcel aria-hidden="true" />;
    }
    return <AiOutlineFile aria-hidden="true" />;
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
            <div className={styles.workspaceMenuWrap}>
              <button
                className={`${styles.workspaceBtn} ${showWorkspaceMenu ? styles.workspaceBtnOpen : ''}`}
                onClick={() => setShowWorkspaceMenu((open) => !open)}
                aria-expanded={showWorkspaceMenu}
                aria-haspopup="menu"
              >
                <Building2 size={17} />
                {selectedWorkspace}
                <ChevronDown size={16} className={showWorkspaceMenu ? styles.chevronOpen : ''} />
              </button>
              {showWorkspaceMenu && (
                <>
                  <button className={styles.workspaceBackdrop} aria-label="워크스페이스 메뉴 닫기" onClick={() => setShowWorkspaceMenu(false)} />
                  <div className={styles.workspaceDropdown} role="menu">
                    <div className={styles.workspaceDropdownTitle}>워크스페이스 전환</div>
                    {['마케팅팀 인수인계', '운영팀 인수인계', '디자인팀 인수인계'].map((workspace) => (
                      <button
                        key={workspace}
                        className={`${styles.workspaceOption} ${selectedWorkspace === workspace ? styles.workspaceOptionActive : ''}`}
                        onClick={() => {
                          setSelectedWorkspace(workspace);
                          setShowWorkspaceMenu(false);
                        }}
                        role="menuitem"
                      >
                        <Building2 size={17} />
                        <span>{workspace}</span>
                        {selectedWorkspace === workspace && <Check size={17} className={styles.workspaceCheck} />}
                      </button>
                    ))}
                    <div className={styles.workspaceDropdownDivider} />
                    <Link href="/workspace-settings" className={styles.workspaceManage} onClick={() => setShowWorkspaceMenu(false)}>
                      <Settings size={17} />
                      워크스페이스 관리
                    </Link>
                  </div>
                </>
              )}
            </div>
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
                    <span className={`${styles.taskType} ${task.source.toLowerCase().endsWith('.pdf') ? styles.taskTypePdf : styles.taskTypeExcel}`}>
                      <span className={styles.taskFileIcon}>{getTaskFileIcon(task.source)}</span>
                      <span>{getDisplayLabel(task.type)}</span>
                    </span>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <span className={styles.taskTime}>{task.source}</span>
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
                  <div
                    key={file.id}
                    className={styles.fileCard}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedFile(file);
                      setIsFileSummaryModalOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedFile(file);
                        setIsFileSummaryModalOpen(true);
                      }
                    }}
                  >
                    <div className={styles.fileIcon}>{getFileIcon(file.type)}</div>
                    <div className={styles.fileDetails}>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileSize}>{file.format} · {file.size}</div>
                      <span className={styles.fileStatus}>{getDisplayLabel(file.status)}</span>
                    </div>
                    <button
                      className={styles.aiBtn}
                      onClick={(event) => {
                        event.stopPropagation();
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
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickQuestion.trim()) {
                    router.push(`/ai-chat?q=${encodeURIComponent(quickQuestion.trim())}`);
                  }
                }}
              />
              <button
                className={styles.aiSubmitBtn}
                onClick={() => {
                  if (quickQuestion.trim()) {
                    router.push(`/ai-chat?q=${encodeURIComponent(quickQuestion.trim())}`);
                  } else {
                    router.push('/ai-chat');
                  }
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
        <DailyTasksModal onClose={() => setShowDailyTasksModal(false)} />
      )}
      {showAllFilesModal && (
        <AllFilesModal
          onClose={() => setShowAllFilesModal(false)}
          onSelectFile={(file) => {
            setSelectedFile({
              id: `all-file-${file.id}`,
              name: file.name,
              size: file.size,
              format: file.type,
              status: file.status,
              type: file.type === 'PDF' ? 'pdf' : file.type === 'XLSX' ? 'excel' : 'file',
              updatedAt: file.date,
              relatedTask: '온보딩 참고 자료 확인',
            });
            setShowAllFilesModal(false);
            setIsFileSummaryModalOpen(true);
          }}
        />
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
          <>
            <ModalSecondaryButton onClick={() => setIsOnboardingProgressModalOpen(false)}>
              닫기
            </ModalSecondaryButton>
            <ModalPrimaryButton onClick={() => { setIsOnboardingProgressModalOpen(false); router.push('/30day-plan'); }}>
              30일 계획에서 보기
            </ModalPrimaryButton>
          </>
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

      {/* 파일 상세 */}
      <Modal
        open={isFileSummaryModalOpen && selectedFile !== null}
        onClose={() => setIsFileSummaryModalOpen(false)}
        title="파일 상세"
        footer={
          <>
            <ModalSecondaryButton onClick={() => setIsFileSummaryModalOpen(false)}>닫기</ModalSecondaryButton>
            <ModalPrimaryButton onClick={() => { setIsFileSummaryModalOpen(false); router.push(`/ai-chat?q=${encodeURIComponent(selectedFile?.name + ' 문서 내용 요약해줘')}`); }}>
              AI에게 질문하기
            </ModalPrimaryButton>
          </>
        }
      >
        {selectedFile && (
          <div className={styles.modalInfoCard}>
            <div className={styles.fileDetailHeading}>
              <span className={`${styles.fileDetailIcon} ${selectedFile.type === 'pdf' ? styles.fileDetailPdf : styles.fileDetailExcel}`}>{getFileIcon(selectedFile.type)}</span>
              <div>
                <div className={styles.modalInfoTitle}>{selectedFile.name}</div>
                <span className={styles.fileDetailStatus}>{getDisplayLabel(selectedFile.status)}</span>
              </div>
            </div>
            <div className={styles.modalInfoRow}>
              <span>파일 유형</span>
              <span>{selectedFile.format} 파일</span>
            </div>
            <div className={styles.modalInfoRow}>
              <span>크기</span>
              <span>{selectedFile.size}</span>
            </div>
            <div className={styles.modalInfoRow}>
              <span>최근 수정일</span>
              <span>{selectedFile.updatedAt}</span>
            </div>
            <div className={styles.modalInfoRow}>
              <span>관련 업무</span>
              <span>{selectedFile.relatedTask}</span>
            </div>
            <div className={styles.fileDetailActions}>
              <button onClick={() => { setIsFileSummaryModalOpen(false); router.push(`/ai-chat?q=${encodeURIComponent(selectedFile.name + ' 문서 요약해줘')}`); }}>AI 요약</button>
              <button onClick={() => { setIsFileSummaryModalOpen(false); router.push('/file-management'); }}>파일 관리로 이동</button>
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
          <>
            <ModalSecondaryButton onClick={() => setIsTaskDetailsModalOpen(false)}>
              닫기
            </ModalSecondaryButton>
            <ModalPrimaryButton onClick={() => { setIsTaskDetailsModalOpen(false); router.push('/daily-tasks'); }}>
              오늘 할 일에서 보기
            </ModalPrimaryButton>
          </>
        }
      >
        {selectedTask && (
          <div className={styles.modalInfoCard}>
            <div className={styles.modalInfoTitle}>{selectedTask.title}</div>
            <div className={styles.modalInfoRow}>
              <span>구분</span>
              <span>{getDisplayLabel(selectedTask.type)}</span>
            </div>
            <div className={styles.modalInfoRow}>
              <span>상태</span>
              <span>{getDisplayLabel(selectedTask.status)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* 인공지능 질문 */}
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
            <ModalPrimaryButton onClick={() => { setIsAIInquiryModalOpen(false); router.push('/ai-chat'); }}>
              질문하러 가기
            </ModalPrimaryButton>
          </>
        }
      >
        <p style={{ fontSize: '13.5px', color: '#475569', margin: 0 }}>
          업무 지식 베이스를 바탕으로 AI 어시스턴트와 대화를 시작합니다.
        </p>
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
