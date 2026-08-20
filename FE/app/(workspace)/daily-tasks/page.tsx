'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Lightbulb, Bell, HelpCircle, Zap, ClipboardList } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useMe } from '@/components/require-workspace';
import { saveWorkspaceId } from '@/lib/storage';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  completeRecommendation,
  dismissRecommendation,
  getRecommendationsToday,
  type RecommendationResponse,
} from '@/lib/api';
import styles from './daily-tasks.module.css';

/** 화면의 세 칼럼. 서버 PlanItemType 을 여기에 나눠 담는다 */
type SectionKey = 'document' | 'checklist' | 'practice';

const SECTIONS: Array<{ key: SectionKey; title: string }> = [
  { key: 'document', title: '문서 읽기' },
  { key: 'checklist', title: '체크리스트' },
  { key: 'practice', title: '실습 / 업무' },
];

/** PERSON(사람 만나기)은 실습/업무 칼럼에 함께 보여 준다 */
function sectionOf(type: string): SectionKey {
  if (type === 'DOCUMENT') return 'document';
  if (type === 'CHECKLIST') return 'checklist';
  return 'practice';
}

const STATUS_COLOR: Record<string, string> = {
  DONE: '#287456',
  PENDING: '#80683D',
  SKIPPED: '#9CA3AF',
  DISMISSED: '#9CA3AF',
};

export default function DailyTasksPage() {
  const router = useRouter();
  const me = useMe();
  const { showToast } = useToast();

  const [items, setItems] = useState<RecommendationResponse[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [isDailyGoalsModalOpen, setIsDailyGoalsModalOpen] = useState(false);
  const [isDocumentListModalOpen, setIsDocumentListModalOpen] = useState(false);
  const [isChecklistItemsModalOpen, setIsChecklistItemsModalOpen] = useState(false);
  const [isTaskCategoriesModalOpen, setIsTaskCategoriesModalOpen] = useState(false);
  const [isTaskActionsModalOpen, setIsTaskActionsModalOpen] = useState(false);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getRecommendationsToday();
      setItems(response.items ?? []);
      setDate(response.date ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오늘 할 일을 불러오지 못했습니다.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const result: Record<SectionKey, RecommendationResponse[]> = {
      document: [],
      checklist: [],
      practice: [],
    };
    // 우선순위가 높은(숫자가 작은) 항목을 위로 올린다
    for (const item of [...items].sort((a, b) => a.priority - b.priority)) {
      result[sectionOf(item.type)].push(item);
    }
    return result;
  }, [items]);

  const selectedTask = useMemo(
    () => items.find(item => item.id === selectedTaskId) ?? null,
    [items, selectedTaskId]
  );

  const statusInfo = useMemo(
    () => ({
      done: items.filter(i => i.status === 'DONE').length,
      pending: items.filter(i => i.status === 'PENDING').length,
      skipped: items.filter(i => i.status === 'SKIPPED').length,
      dismissed: items.filter(i => i.status === 'DISMISSED').length,
    }),
    [items]
  );

  const total = items.length;
  const progressPercentage = total === 0 ? 0 : Math.round((statusInfo.done / total) * 100);

  const handleComplete = async (item: RecommendationResponse) => {
    setUpdatingId(item.id);
    try {
      await completeRecommendation(item.id);
      showToast('완료 처리했습니다.', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '완료 처리에 실패했습니다.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDismiss = async (item: RecommendationResponse) => {
    setUpdatingId(item.id);
    try {
      await dismissRecommendation(item.id);
      showToast('오늘 추천에서 건너뛰었습니다.', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '건너뛰기에 실패했습니다.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  /** 출처 파일 이름으로 아이콘을 고른다 */
  const getTaskIcon = (item: RecommendationResponse) => {
    const source = (item.source ?? '').toLowerCase();
    if (source.endsWith('.pdf')) {
      return <FontAwesomeIcon icon={faFilePdf} className={styles.iconPdf} />;
    }
    if (source.endsWith('.xlsx') || source.endsWith('.xls') || source.endsWith('.csv')) {
      return <FontAwesomeIcon icon={faFileExcel} className={styles.iconExcel} />;
    }
    return <ClipboardList size={16} className={styles.iconDefault} />;
  };

  /** 항목의 부가 설명. 서버가 주는 출처/담당자/우선순위로 만든다 */
  const describe = (item: RecommendationResponse) => {
    const parts: string[] = [];
    if (item.source) parts.push(`출처 · ${item.source}`);
    if (item.personName) parts.push(`담당 · ${item.personName}`);
    parts.push(`구분 · ${getDisplayLabel(item.type)}`);
    return parts.join(' · ');
  };

  const renderTaskSection = (title: string, sectionItems: RecommendationResponse[]) => (
    <div key={title} className={styles.taskSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon} />
        <h3 className={styles.sectionTitle}>{title}</h3>
      </div>

      <div className={styles.tasksList}>
        {isLoading ? (
          <div style={{ padding: '16px', color: '#9CA3AF', textAlign: 'center' }}>불러오는 중...</div>
        ) : sectionItems.length > 0 ? (
          sectionItems.map((task) => (
            <div key={task.id} className={styles.taskCard}>
              <div className={styles.taskHeader}>
                <div className={styles.taskNameArea}>
                  <div className={styles.taskIcon}>{getTaskIcon(task)}</div>
                  <span className={styles.taskName}>{task.title}</span>
                  <span
                    className={styles.statusBadge}
                    style={{ color: STATUS_COLOR[task.status] ?? '#9CA3AF' }}
                  >
                    {getDisplayLabel(task.status)}
                  </span>
                </div>
                <span className={styles.taskTime}>우선순위 {task.priority}</span>
              </div>
              <div className={styles.taskDescription}>{describe(task)}</div>
              <button
                className={styles.actionBtn}
                disabled={task.status === 'DONE' || updatingId !== null}
                onClick={() => void handleComplete(task)}
              >
                {task.status === 'DONE' ? '완료됨' : updatingId === task.id ? '처리 중...' : '완료'}
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  setSelectedTaskId(task.id);
                  setIsTaskActionsModalOpen(true);
                }}
              >
                작업 옵션
              </button>
            </div>
          ))
        ) : (
          <div style={{ padding: '16px', color: '#9CA3AF', textAlign: 'center' }}>항목이 없습니다</div>
        )}

        <button className={styles.addMoreBtn} onClick={() => void load()} disabled={isLoading}>
          + 추천 다시 받기
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
            <h1 className={styles.greeting}>안녕하세요, {me?.name ?? '사용자'}님</h1>
            <p className={styles.description}>
              인공지능이 30일 계획과 현재 진행 상황을 바탕으로 오늘 해야 할 일을 추천합니다.
              {date ? ` (기준 ${date})` : ''}
            </p>
          </div>
          <div className={styles.headerRight}>
            <select
              className={styles.workspaceBtn}
              value={me?.currentWorkspace?.id ?? ''}
              onChange={(e) => {
                if (!e.target.value || e.target.value === me?.currentWorkspace?.id) return;
                saveWorkspaceId(e.target.value);
                window.location.reload();
              }}
              aria-label="업무 공간 전환"
            >
              {(me?.workspaces ?? []).map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')} title="알림 센터">
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => setIsTaskCategoriesModalOpen(true)} title="업무 카테고리 안내">
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
                <div className={styles.badge} style={{ color: '#287456' }}>완료 {statusInfo.done}</div>
                <div className={styles.badge} style={{ color: '#80683D' }}>대기 {statusInfo.pending}</div>
                <div className={styles.badge} style={{ color: '#9CA3AF' }}>건너뜀 {statusInfo.skipped}</div>
                <div className={styles.badge} style={{ color: '#9CA3AF' }}>제외 {statusInfo.dismissed}</div>
              </div>
            </div>
            <div className={styles.progressContainer}>
              <div className={styles.progressLabel}>{statusInfo.done} / {total} 완료</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }} />
              </div>
            </div>
          </div>

          {error && (
            <div className={styles.dismissNote} style={{ color: 'var(--danger)' }}>
              {error}{' '}
              <button className={styles.moreInfoLink} onClick={() => void load()}>다시 시도</button>
            </div>
          )}

          {/* Task Sections Grid */}
          <div className={styles.sectionsGrid}>
            {SECTIONS.map(section => renderTaskSection(section.title, grouped[section.key]))}
          </div>

          {/* Recommendation Info */}
          <div className={styles.recommendationCard}>
            <div className={styles.recommendationHeader}>
              <Lightbulb size={20} />
              <h3 className={styles.recommendationTitle}>추천 기준</h3>
            </div>
            <p className={styles.recommendationText}>
              30일 계획의 우선순위와 현재 진행 상황을 함께 고려해 오늘 할 일을 고릅니다.
            </p>
            <button className={styles.moreInfoLink} onClick={() => setIsRecommendationModalOpen(true)}>
              추천 기준 자세히 보기 <ChevronRight size={16} />
            </button>
          </div>

          {/* Dismissible Note */}
          <div className={styles.dismissNote}>
            추천 항목은 작업 옵션에서 언제든 건너뛸 수 있습니다.
          </div>

          {/* AI Question Button */}
          <button className={styles.aiQuestionBtn} onClick={() => setIsDailyGoalsModalOpen(true)}>
            <Zap size={16} /> 오늘의 목표 보기
          </button>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. 오늘의 목표 */}
      {isDailyGoalsModalOpen && (
        <Modal
          open
          onClose={() => setIsDailyGoalsModalOpen(false)}
          title="오늘의 목표"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDailyGoalsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton onClick={() => { setIsDailyGoalsModalOpen(false); router.push('/ai-chat'); }}>
                AI에게 질문하기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.goalsCard}>
            <div className={styles.goalItem}>
              <h4>오늘 목표</h4>
              <p>추천 {total}개 중 {statusInfo.done}개 완료 · 남은 항목 {statusInfo.pending}개</p>
            </div>
            <div className={styles.goalItem}>
              <h4>추천 순서</h4>
              {items.length === 0 ? (
                <p>오늘 추천된 항목이 없습니다.</p>
              ) : (
                <p>
                  {[...items]
                    .sort((a, b) => a.priority - b.priority)
                    .map((item, index) => `${index + 1}. ${item.title}`)
                    .join('\n')
                    .split('\n')
                    .map(line => (
                      <React.Fragment key={line}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 2. 문서 목록 */}
      {isDocumentListModalOpen && (
        <Modal
          open
          onClose={() => setIsDocumentListModalOpen(false)}
          title="문서 목록"
          footer={<ModalSecondaryButton onClick={() => setIsDocumentListModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.documentList}>
            {grouped.document.length === 0 ? (
              <div className={styles.docDesc}>오늘 읽어야 할 문서가 없습니다.</div>
            ) : (
              grouped.document.map((doc) => (
                <div key={doc.id} className={styles.documentItem}>
                  <div className={styles.docName}>{doc.title}</div>
                  <div className={styles.docMeta}>
                    <span className={styles.docTime}>우선순위 {doc.priority}</span>
                    <span className={styles.docDesc}>{describe(doc)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* 3. 체크리스트 항목 */}
      {isChecklistItemsModalOpen && (
        <Modal
          open
          onClose={() => setIsChecklistItemsModalOpen(false)}
          title="체크리스트 항목"
          footer={<ModalSecondaryButton onClick={() => setIsChecklistItemsModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.checklistList}>
            {grouped.checklist.length === 0 ? (
              <div className={styles.itemDesc}>오늘 처리할 체크리스트가 없습니다.</div>
            ) : (
              grouped.checklist.map((item) => (
                <div key={item.id} className={styles.checklistItemModal}>
                  <input
                    type="checkbox"
                    checked={item.status === 'DONE'}
                    disabled={item.status === 'DONE' || updatingId !== null}
                    onChange={() => void handleComplete(item)}
                  />
                  <div>
                    <div className={styles.itemName}>{item.title}</div>
                    <div className={styles.itemDesc}>{describe(item)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* 4. 업무 카테고리 */}
      {isTaskCategoriesModalOpen && (
        <Modal
          open
          onClose={() => setIsTaskCategoriesModalOpen(false)}
          title="업무 카테고리"
          footer={<ModalSecondaryButton onClick={() => setIsTaskCategoriesModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.categoryList}>
            <div className={styles.categoryItem}>
              <h4>문서 읽기 ({grouped.document.length})</h4>
              <p>업무 관련 문서 및 참고 자료 검토</p>
            </div>
            <div className={styles.categoryItem}>
              <h4>체크리스트 ({grouped.checklist.length})</h4>
              <p>완료해야 할 주요 업무 항목</p>
            </div>
            <div className={styles.categoryItem}>
              <h4>실습 / 업무 ({grouped.practice.length})</h4>
              <p>실제 업무 수행, 담당자 미팅 및 학습</p>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. 작업 옵션 */}
      {isTaskActionsModalOpen && selectedTask && (
        <Modal
          open
          onClose={() => setIsTaskActionsModalOpen(false)}
          title="작업 옵션"
          footer={<ModalSecondaryButton onClick={() => setIsTaskActionsModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.actionList}>
            <button
              className={styles.actionItem}
              disabled={selectedTask.status === 'DONE' || updatingId !== null}
              onClick={() => {
                void handleComplete(selectedTask);
                setIsTaskActionsModalOpen(false);
              }}
            >
              완료 처리
            </button>
            <button
              className={styles.actionItem}
              onClick={() => {
                setIsTaskActionsModalOpen(false);
                router.push(`/ai-chat?q=${encodeURIComponent(`${selectedTask.title} 관련해서 알려줘`)}`);
              }}
            >
              AI에게 질문하기
            </button>
            <button
              className={styles.actionItem}
              onClick={() => {
                setIsTaskActionsModalOpen(false);
                router.push('/30day-plan');
              }}
            >
              30일 계획에서 보기
            </button>
            <button
              className={styles.actionItem}
              style={{ color: '#dc2626' }}
              disabled={updatingId !== null}
              onClick={() => {
                void handleDismiss(selectedTask);
                setIsTaskActionsModalOpen(false);
              }}
            >
              건너뛰기
            </button>
          </div>
        </Modal>
      )}

      {/* 6. 추천 기준 */}
      {isRecommendationModalOpen && (
        <Modal
          open
          onClose={() => setIsRecommendationModalOpen(false)}
          title="추천 기준"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsRecommendationModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setIsRecommendationModalOpen(false);
                  setIsDocumentListModalOpen(true);
                }}
              >
                오늘 문서 목록 보기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.criteriaList}>
            <div className={styles.criteriaItem}>
              <h4>우선순위</h4>
              <p>서버가 계산한 우선순위(priority)가 낮은 숫자일수록 먼저 제시됩니다.</p>
            </div>
            <div className={styles.criteriaItem}>
              <h4>계획 진행도</h4>
              <p>30일 계획에서 아직 끝나지 않은 항목을 오늘 할 일로 올립니다.</p>
            </div>
            <div className={styles.criteriaItem}>
              <h4>문서 준비 상태</h4>
              <p>학습이 끝난(READY) 문서를 참고 자료로 함께 제시합니다.</p>
            </div>
            <div className={styles.criteriaItem}>
              <h4>건너뛴 항목</h4>
              <p>건너뛴 항목은 오늘 추천에서 빠집니다.</p>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <button className={styles.moreInfoLink} onClick={() => { setIsRecommendationModalOpen(false); setIsChecklistItemsModalOpen(true); }}>
              오늘 체크리스트 보기 <ChevronRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
