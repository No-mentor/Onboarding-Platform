'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Lightbulb, Bell, HelpCircle, Zap, ClipboardList, BookOpen, CheckSquare, Briefcase } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { getRecommendationsToday, completeRecommendation } from '@/lib/api';
import { getUserName } from '@/lib/storage';
import { useToast } from '@/components/ui/toast';
import styles from './daily-tasks.module.css';

export default function DailyTasksPage() {
  const router = useRouter();
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();

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
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('사용자');

  const [tasks, setTasks] = useState({
    document: [] as any[],
    checklist: [] as any[],
    practice: [] as any[],
  });

  // Load recommendations on mount
  useEffect(() => {
    const name = getUserName();
    if (name) setUserName(name);

    const loadRecommendations = async () => {
      try {
        setIsLoading(true);
        const response = await getRecommendationsToday();
        const rawItems = response.items || [];

        const normalizedItems = rawItems.map((t: any) => ({
          id: t.id,
          name: t.title || '할 일 항목',
          title: t.title || '할 일 항목',
          type: (t.type || 'document').toLowerCase(),
          rawType: t.type,
          status: (t.status || 'PENDING').toLowerCase(),
          time: t.source === 'PLAN' ? '30일 계획' : (t.source || '오늘'),
          description: t.description || (t.personName ? `담당자 / 멘토: ${t.personName}` : '온보딩 추천 과제'),
        }));

        const categorized = {
          document: normalizedItems.filter((t: any) => t.type === 'document'),
          checklist: normalizedItems.filter((t: any) => t.type === 'checklist'),
          practice: normalizedItems.filter((t: any) => t.type === 'practice' || t.type === 'person'),
        };

        setTasks(categorized);
      } catch (err) {
        console.error('할 일 로드 실패:', err);
        showToast('할 일을 불러올 수 없습니다', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadRecommendations();
  }, []);

  const toggleTaskComplete = async (taskId: string, category: 'document' | 'checklist' | 'practice') => {
    const currentTask = tasks[category].find(t => t.id === taskId);
    const nextStatus = currentTask?.status === 'done' ? 'pending' : 'done';

    setTasks((prevTasks) => ({
      ...prevTasks,
      [category]: prevTasks[category].map((task) =>
        task.id === taskId
          ? { ...task, status: nextStatus }
          : task
      ),
    }));

    try {
      if (nextStatus === 'done') {
        await completeRecommendation(taskId);
        showToast('할 일을 완료했습니다.', 'success');
      } else {
        showToast('할 일을 미완료로 변경했습니다.', 'info');
      }
    } catch (err) {
      console.error('완료 상태 변경 실패:', err);
    }
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
      case 'document':
        return <BookOpen size={16} className={styles.iconDefault} />;
      case 'checklist':
        return <CheckSquare size={16} className={styles.iconDefault} />;
      default:
        return <Briefcase size={16} className={styles.iconDefault} />;
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
        return '건너뜀';
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
  const progressPercentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

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
                  {getFileIcon(task.type)}
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

        <button
          className={styles.addMoreBtn}
          onClick={() => router.push('/ai-chat?q=' + encodeURIComponent('오늘 할 일 추천해줘'))}
        >
          + AI에게 추가 과제 추천받기
        </button>
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
            <h1 className={styles.greeting}>안녕하세요, {userName}님</h1>
            <p className={styles.description}>AI가 30일 계획과 현재 진행 상황을 바탕으로 오늘 해야 할 일을 추천합니다.</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.workspaceBtn} onClick={() => router.push('/workspace-selection')}>
              워크스페이스 전환
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')}>
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
          <button className={styles.aiQuestionBtn} onClick={() => router.push('/ai-chat')}>
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
          title="오늘의 온보딩 가이드"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDailyGoalsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setIsDailyGoalsModalOpen(false);
                  router.push('/ai-chat');
                }}
              >
                AI 어시스턴트에게 질문하기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.goalsCard}>
            <div className={styles.goalItem}>
              <h4>오늘의 핵심 목표</h4>
              <p>추천된 온보딩 문서 확인 및 당일 체크리스트 과제를 수행하세요.</p>
            </div>
            <div className={styles.goalItem}>
              <h4>추천 학습 순서</h4>
              <p>
                1. 추천 사내 가이드 및 업무 문서 열람<br/>
                2. 계정 권한 및 업무 툴 설정 확인<br/>
                3. 담당 멘토와의 온보딩 체크리스트 점검
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
          title="오늘의 추천 문서"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDocumentListModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton onClick={() => router.push('/file-management')}>
                파일 탐색기로 이동
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.documentList}>
            {tasks.document.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9CA3AF', margin: '20px 0' }}>오늘 확인해야 할 추천 문서가 없습니다.</p>
            ) : (
              tasks.document.map((doc) => (
                <div key={doc.id} className={styles.documentItem}>
                  <div className={styles.docName}>{doc.name}</div>
                  <div className={styles.docMeta}>
                    <span className={styles.docTime}>{doc.time}</span>
                    <span className={styles.docDesc}>{doc.description}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* 3. Checklist Items Modal */}
      {isChecklistItemsModalOpen && (
        <Modal
          open
          onClose={() => setIsChecklistItemsModalOpen(false)}
          title="오늘의 체크리스트 항목"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsChecklistItemsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton onClick={() => router.push('/checklist')}>
                체크리스트 전체보기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.checklistList}>
            {tasks.checklist.map((item) => (
              <div key={item.id} className={styles.checklistItemModal}>
                <input
                  type="checkbox"
                  checked={item.status === 'done'}
                  onChange={() => toggleTaskComplete(item.id, 'checklist')}
                />
                <div>
                  <div className={styles.itemName} style={{ textDecoration: item.status === 'done' ? 'line-through' : 'none' }}>
                    {item.name}
                  </div>
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
          title="업무 카테고리 안내"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTaskCategoriesModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.categoryList}>
            <div className={styles.categoryItem}>
              <h4>문서 읽기 (Documentation)</h4>
              <p>업무 관련 규정, 가이드라인 및 사내 참고 자료 검토</p>
            </div>
            <div className={styles.categoryItem}>
              <h4>체크리스트 (Checklist)</h4>
              <p>환경 설정, 권한 획득 등 필수로 완료해야 할 실무 항목</p>
            </div>
            <div className={styles.categoryItem}>
              <h4>실습 / 멘토링 (Practice & Mentoring)</h4>
              <p>실제 실무 과제 수행 및 멘토 피드백 세션</p>
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
            <button
              className={styles.actionItem}
              onClick={() => {
                toggleTaskComplete(selectedTask.id, selectedTask.type || 'checklist');
                setIsTaskActionsModalOpen(false);
              }}
            >
              {selectedTask.status === 'done' ? '미완료로 변경' : '완료 처리'}
            </button>
            <button
              className={styles.actionItem}
              onClick={() => {
                setIsTaskActionsModalOpen(false);
                router.push(`/ai-chat?q=${encodeURIComponent(selectedTask.title || selectedTask.name)}`);
              }}
            >
              AI에게 관련 질문하기
            </button>
            <button
              className={styles.actionItem}
              onClick={() => {
                setIsTaskActionsModalOpen(false);
                router.push('/30day-plan');
              }}
            >
              30일 계획에서 확인
            </button>
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
              <ModalSecondaryButton onClick={() => setIsMeetingNotesModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  try {
                    localStorage.setItem('daily_meeting_notes', meetingNotes);
                    showToast('회의 메모가 안전하게 저장되었습니다.', 'success');
                  } catch (e) {
                    showToast('메모 저장 실패', 'error');
                  }
                  setIsMeetingNotesModalOpen(false);
                }}
              >
                저장
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>메모 내용</label>
            <textarea
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder="회의 중 나눈 주요 피드백이나 질문을 메모하세요."
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
