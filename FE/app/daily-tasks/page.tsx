'use client';

import React, { useState } from 'react';
import { ChevronRight, Lightbulb, Bell, HelpCircle, Zap, ClipboardList } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import styles from './daily-tasks.module.css';

export default function DailyTasksPage() {
  const { run, isPending } = useModalAction();
  // Modal states
  const [isDailyGoalsModalOpen, setIsDailyGoalsModalOpen] = useState(false);
  const [isDocumentListModalOpen, setIsDocumentListModalOpen] = useState(false);
  const [isChecklistItemsModalOpen, setIsChecklistItemsModalOpen] = useState(false);
  const [isTaskCategoriesModalOpen, setIsTaskCategoriesModalOpen] = useState(false);
  const [isTaskActionsModalOpen, setIsTaskActionsModalOpen] = useState(false);
  const [isMeetingNotesModalOpen, setIsMeetingNotesModalOpen] = useState(false);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [meetingNotes, setMeetingNotes] = useState('');

  const [tasks, setTasks] = useState({
    document: [
      { id: 1, name: '행사운영가이드.pdf 읽기', type: 'pdf', status: 'done', time: '10:30 까지', description: '추천 이유: 오늘 진행 필요', category: 'document' },
      { id: 2, name: '예산안_v7.xlsx 검토', type: 'excel', status: 'pending', time: '14:00 까지', description: '예상 소요: 20 분', category: 'document' },
    ],
    checklist: [
      { id: 3, name: '신입 계정 권한 확인', type: 'checklist', status: 'in_progress', time: '14:00 까지', description: '추천 이유: 오늘 진행 필요', category: 'checklist' },
      { id: 4, name: '주간회의 자료 준비', type: 'checklist', status: 'pending', time: '16:00 까지', description: '예상 소요: 20 분', category: 'checklist' },
    ],
    practice: [
      { id: 5, name: '예산 생성 업데이트', type: 'practice', status: 'pending', time: '16:00 까지', description: '추천 이유: 오늘 진행 필요', category: 'practice' },
      { id: 6, name: '거래처 정보 확인하기', type: 'practice', status: 'pending', time: '17:00 까지', description: '예상 소요: 20 분', category: 'practice' },
    ],
  });

  const toggleTaskComplete = (taskId: number, category: 'document' | 'checklist' | 'practice') => {
    setTasks((prevTasks) => ({
      ...prevTasks,
      [category]: prevTasks[category].map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === 'done' ? 'pending' : 'done' }
          : task
      ),
    }));
  };

  const getProgress = () => {
    const allTasks = [...tasks.document, ...tasks.checklist, ...tasks.practice];
    const completedCount = allTasks.filter(t => t.status === 'done').length;
    return { completed: completedCount, total: allTasks.length };
  };

  const getStatusInfo = () => {
    const allTasks = [...tasks.document, ...tasks.checklist, ...tasks.practice];
    return {
      done: allTasks.filter(t => t.status === 'done').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      skipped: allTasks.filter(t => t.status === 'skipped').length,
    };
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FontAwesomeIcon icon={faFilePdf} className={styles.iconPdf} />;
      case 'excel':
        return <FontAwesomeIcon icon={faFileExcel} className={styles.iconExcel} />;
      default:
        return <ClipboardList size={16} className={styles.iconDefault} />;
    }
  };

  const getStatusBadgeText = (status: string) => {
    switch (status) {
      case 'done':
        return '완료';
      case 'in_progress':
        return '진행 중';
      case 'pending':
        return '대기';
      case 'skipped':
        return '건너뜨림';
      default:
        return '대기';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'done':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'pending':
        return '#F59E0B';
      case 'skipped':
        return '#9CA3AF';
      default:
        return '#9CA3AF';
    }
  };

  const progress = getProgress();
  const statusInfo = getStatusInfo();
  const progressPercentage = (progress.completed / progress.total) * 100;

  const renderTaskSection = (title: string, icon: string, category: 'document' | 'checklist' | 'practice', items?: any[]) => (
    <div className={styles.taskSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </div>

      <div className={styles.tasksList}>
        {items && items.length > 0 ? items.map((task) => (
          <div key={task.id} className={styles.taskCard}>
            <div className={styles.taskHeader}>
              <div className={styles.taskNameArea}>
                <div className={styles.taskIcon}>
                  {task.type === 'document' || task.type === 'pdf' || task.type === 'excel'
                    ? getFileIcon(task.type === 'document' ? 'pdf' : task.type)
                    : <ClipboardList size={16} className={styles.iconDefault} />}
                </div>
                <span className={styles.taskName}>{task.name}</span>
                <span
                  className={styles.statusBadge}
                  style={{ color: getStatusBadgeColor(task.status) }}
                >
                  {getStatusBadgeText(task.status)}
                </span>
              </div>
              <span className={styles.taskTime}>{task.time}</span>
            </div>
            <div className={styles.taskDescription}>{task.description}</div>
            <button
              className={styles.actionBtn}
              onClick={() => toggleTaskComplete(task.id, category)}
            >
              {task.status === 'done' ? '미완료' : '완료'}
            </button>
          </div>
        )) : <div style={{ padding: '16px', color: '#9CA3AF', textAlign: 'center' }}>항목이 없습니다</div>}

        <button className={styles.addMoreBtn}>+ 항목 추천 받기</button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.greeting}>안녕하세요, 김세원님</h1>
            <p className={styles.description}>AI 가 30 일 계획과 현재 진행 상황을 바탕으로 오늘 해야 할 일을 추천합니다.</p>
          </div>
          <div className={styles.headerRight}>
            <select className={styles.workspaceBtn}>
              <option>마케팅팀 인수인계</option>
            </select>
            <button className={styles.notifBtn}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn}>
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        <div className={styles.contentArea}>
          {/* Progress Card */}
          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <h2 className={styles.progressTitle}>오늘의 진행</h2>
              <div className={styles.statusBadges}>
                <div className={styles.badge} style={{ color: '#10B981' }}>완료 {statusInfo.done}</div>
                <div className={styles.badge} style={{ color: '#3B82F6' }}>진행 {statusInfo.inProgress}</div>
                <div className={styles.badge} style={{ color: '#F59E0B' }}>대기 {statusInfo.pending}</div>
                <div className={styles.badge} style={{ color: '#9CA3AF' }}>건너뜀 {statusInfo.skipped}</div>
              </div>
            </div>
            <div className={styles.progressContainer}>
              <div className={styles.progressLabel}>{progress.completed} / {progress.total} 완료</div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Task Sections Grid */}
          <div className={styles.sectionsGrid}>
            {renderTaskSection('문서 읽기', '', 'document', tasks.document)}
            {renderTaskSection('체크리스트', '', 'checklist', tasks.checklist)}
            {renderTaskSection('실습 / 업무', '', 'practice', tasks.practice)}
          </div>

          {/* Recommendation Info */}
          <div className={styles.recommendationCard}>
            <div className={styles.recommendationHeader}>
              <Lightbulb size={20} />
              <h3 className={styles.recommendationTitle}>추천 기준</h3>
            </div>
            <p className={styles.recommendationText}>
              우선순위, 마감 시간, 현재 진행 상황, 팀 목표 출업적으로 고려합니다.
            </p>
            <button className={styles.moreInfoLink} onClick={() => setIsRecommendationModalOpen(true)}>
              추천 기준 자세히 보기 <ChevronRight size={16} />
            </button>
          </div>

          {/* Dismissible Note */}
          <div className={styles.dismissNote}>
            추천 항목은 언제든 dismiss (건너뛰기) 할 수 있습니다.
          </div>

          {/* AI Question Button */}
          <button className={styles.aiQuestionBtn} onClick={() => setIsDailyGoalsModalOpen(true)}>
            <Zap size={16} /> AI에게 질문하기
          </button>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. Daily Goals Modal */}
      {isDailyGoalsModalOpen && (
        <Modal
          open
          onClose={() => setIsDailyGoalsModalOpen(false)}
          title="오늘의 목표"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDailyGoalsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('daily-tasks-0')}
                onClick={() => run('daily-tasks-0', '처리를 완료했습니다.', () => setIsDailyGoalsModalOpen(false))}
              >
                AI 질문 시작
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.goalsCard}>
            <div className={styles.goalItem}>
              <h4>주요 목표</h4>
              <p>팀 프로젝트 마감 전 현재까지의 진행 상황을 보고하세요.</p>
            </div>
            <div className={styles.goalItem}>
              <h4>추천 순서</h4>
              <p>
                1. 행사운영가이드 읽기<br/>
                2. 신입 계정 권한 확인<br/>
                3. 예산안 검토
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Document List Modal */}
      {isDocumentListModalOpen && (
        <Modal
          open
          onClose={() => setIsDocumentListModalOpen(false)}
          title="문서 목록"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDocumentListModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.documentList}>
            {tasks.document.map((doc) => (
              <div key={doc.id} className={styles.documentItem}>
                <div className={styles.docName}>{doc.name}</div>
                <div className={styles.docMeta}>
                  <span className={styles.docTime}>{doc.time}</span>
                  <span className={styles.docDesc}>{doc.description}</span>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* 3. Checklist Items Modal */}
      {isChecklistItemsModalOpen && (
        <Modal
          open
          onClose={() => setIsChecklistItemsModalOpen(false)}
          title="체크리스트 항목"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsChecklistItemsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('daily-tasks-1')}
                onClick={() => run('daily-tasks-1', '변경 내용을 저장했습니다.', () => setIsChecklistItemsModalOpen(false))}
              >
                저장
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.checklistList}>
            {tasks.checklist.map((item) => (
              <div key={item.id} className={styles.checklistItemModal}>
                <input type="checkbox" />
                <div>
                  <div className={styles.itemName}>{item.name}</div>
                  <div className={styles.itemDesc}>{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* 4. Task Categories Modal */}
      {isTaskCategoriesModalOpen && (
        <Modal
          open
          onClose={() => setIsTaskCategoriesModalOpen(false)}
          title="업무 카테고리"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTaskCategoriesModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.categoryList}>
            <div className={styles.categoryItem}>
              <h4>문서 읽기</h4>
              <p>업무 관련 문서 및 참고 자료 검토</p>
            </div>
            <div className={styles.categoryItem}>
              <h4>체크리스트</h4>
              <p>완료해야 할 주요 업무 항목</p>
            </div>
            <div className={styles.categoryItem}>
              <h4>실습 / 업무</h4>
              <p>실제 업무 수행 및 학습</p>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Task Actions Modal */}
      {isTaskActionsModalOpen && selectedTask && (
        <Modal
          open
          onClose={() => setIsTaskActionsModalOpen(false)}
          title="작업 옵션"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTaskActionsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.actionList}>
            <button className={styles.actionItem}>완료 처리</button>
            <button className={styles.actionItem}>미루기</button>
            <button className={styles.actionItem}>메모 추가</button>
            <button className={styles.actionItem}>일정 변경</button>
            <button className={styles.actionItem} style={{ color: '#dc2626' }}>건너뛰기</button>
          </div>
        </Modal>
      )}

      {/* 6. Meeting Notes Modal */}
      {isMeetingNotesModalOpen && (
        <Modal
          open
          onClose={() => setIsMeetingNotesModalOpen(false)}
          title="회의 메모"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsMeetingNotesModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('daily-tasks-2')}
                onClick={() => run('daily-tasks-2', '변경 내용을 저장했습니다.', () => setIsMeetingNotesModalOpen(false))}
              >
                저장
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>메모</label>
            <textarea
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder="회의 중 나눈 내용을 메모하세요."
              className={styles.textarea}
              rows={6}
            />
          </div>
        </Modal>
      )}

      {/* 7. Recommendation Modal */}
      {isRecommendationModalOpen && (
        <Modal
          open
          onClose={() => setIsRecommendationModalOpen(false)}
          title="추천 기준"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsRecommendationModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.criteriaList}>
            <div className={styles.criteriaItem}>
              <h4>우선순위</h4>
              <p>현재 진행 상황과 팀 목표에 따라 중요도 순으로 정렬</p>
            </div>
            <div className={styles.criteriaItem}>
              <h4>마감 시간</h4>
              <p>시간이 임박한 업무부터 우선으로 제시</p>
            </div>
            <div className={styles.criteriaItem}>
              <h4>학습 곡선</h4>
              <p>신입 적응도와 업무 복잡도를 고려한 추천</p>
            </div>
            <div className={styles.criteriaItem}>
              <h4>의존성 분석</h4>
              <p>선행 업무 완료 여부를 확인하여 제시</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
