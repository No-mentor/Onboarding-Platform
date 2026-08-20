'use client';

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, RotateCcw, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useMe } from '@/components/require-workspace';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  getChecklists,
  updateChecklistItemStatus,
  type ChecklistItemResponse,
  type ChecklistSummaryResponse,
  type ItemStatus,
} from '@/lib/api';
import styles from './checklist.module.css';

/**
 * 서버 ItemStatus 를 화면 분류로 옮긴다.
 * 서버에는 '진행 중' 상태가 없고 PENDING / DONE / SKIPPED(=DISMISSED) 만 있다.
 */
type ChecklistFilter = 'all' | 'PENDING' | 'DONE' | 'SKIPPED';

/** SKIPPED 와 DISMISSED 는 화면에서 같은 칸으로 묶는다 */
function toFilterStatus(status: ItemStatus): 'PENDING' | 'DONE' | 'SKIPPED' {
  if (status === 'DONE') return 'DONE';
  if (status === 'PENDING') return 'PENDING';
  return 'SKIPPED';
}

const STATUS_CLASS: Record<'PENDING' | 'DONE' | 'SKIPPED', string> = {
  DONE: styles.status_complete,
  PENDING: styles.status_pending,
  SKIPPED: styles.status_progress,
};

/** 상태 변경 버튼이 돌아가는 순서 */
const NEXT_STATUS: Record<'PENDING' | 'DONE' | 'SKIPPED', ItemStatus> = {
  PENDING: 'DONE',
  DONE: 'SKIPPED',
  SKIPPED: 'PENDING',
};

export default function ChecklistPage() {
  const router = useRouter();
  const me = useMe();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ChecklistFilter>('all');
  const [summary, setSummary] = useState<ChecklistSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [isTaskOverviewModalOpen, setIsTaskOverviewModalOpen] = useState(false);
  const [isProgressDetailModalOpen, setIsProgressDetailModalOpen] = useState(false);
  const [isFilterOptionsModalOpen, setIsFilterOptionsModalOpen] = useState(false);
  const [isChecklistActionsModalOpen, setIsChecklistActionsModalOpen] = useState(false);
  const [isTaskCategoriesModalOpen, setIsTaskCategoriesModalOpen] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ChecklistFilter>('all');
  const [filterDay, setFilterDay] = useState('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getChecklists('ALL');
      setSummary(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '체크리스트를 불러오지 못했습니다.');
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const items = useMemo(() => summary?.items ?? [], [summary]);
  const selectedItem = useMemo(
    () => items.find(item => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const counts = useMemo(
    () => ({
      PENDING: items.filter(i => toFilterStatus(i.status) === 'PENDING').length,
      DONE: items.filter(i => toFilterStatus(i.status) === 'DONE').length,
      SKIPPED: items.filter(i => toFilterStatus(i.status) === 'SKIPPED').length,
    }),
    [items]
  );

  // 일정 필터 항목은 실제 데이터에 있는 dueDay 로만 만든다
  const dayOptions = useMemo(() => {
    const days = new Set<number>();
    for (const item of items) {
      if (item.dueDay !== null && item.dueDay !== undefined) days.add(item.dueDay);
    }
    return [...days].sort((a, b) => a - b);
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        const status = toFilterStatus(item.status);
        if (activeTab !== 'all' && status !== activeTab) return false;
        if (filterStatus !== 'all' && status !== filterStatus) return false;
        if (filterDay !== 'all' && String(item.dueDay ?? '') !== filterDay) return false;
        return true;
      }),
    [items, activeTab, filterStatus, filterDay]
  );

  const completedCount = summary?.done ?? counts.DONE;
  const totalCount = summary?.total ?? items.length;
  const completionRate = Math.round(Number(summary?.progressPercent ?? 0));

  const changeStatus = async (item: ChecklistItemResponse, status: ItemStatus) => {
    setUpdatingId(item.id);
    try {
      await updateChecklistItemStatus(item.id, status);
      // 완료율은 서버가 계산하므로 목록을 다시 받아 온다
      await load();
      showToast(`상태를 '${getDisplayLabel(status)}'(으)로 변경했습니다.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '상태 변경에 실패했습니다.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleCheck = (item: ChecklistItemResponse) =>
    changeStatus(item, item.status === 'DONE' ? 'PENDING' : 'DONE');

  return (
    <div className={styles.layout}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>내 체크리스트</h1>
            <p className={styles.subtitle}>상태별로 필터링하고 완료 여부를 바로 확인하세요.</p>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.workspaceBtn}
              onClick={() => router.push('/workspace-selection')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{me?.currentWorkspace?.name ?? '업무 공간'}</span>
              <ChevronDown size={16} />
            </button>
            <button className={styles.helpBtn} onClick={() => setIsTaskCategoriesModalOpen(true)} aria-label="도움말 열기" title="업무 카테고리 안내">
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {error && (
            <div className={styles.errorBanner}>
              <span>{error}</span>
              <button type="button" onClick={() => void load()}>다시 시도</button>
            </div>
          )}

          {/* Tabs */}
          <div className={styles.tabsContainer}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('all')}
              >
                전체 ({items.length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'PENDING' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('PENDING')}
              >
                대기 ({counts.PENDING})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'DONE' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('DONE')}
              >
                완료 ({counts.DONE})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'SKIPPED' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('SKIPPED')}
              >
                건너뜀 ({counts.SKIPPED})
              </button>
            </div>
          </div>

          {/* Checklist Items */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>업무 체크리스트</h2>
              <button className={styles.progressInfo} onClick={() => setIsProgressDetailModalOpen(true)} aria-label="완료율 상세 보기">
                <div className={styles.progressLabel}>완료율</div>
                <div className={styles.progressValue}>{completionRate}%</div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${completionRate}%` }}></div>
                </div>
                <div className={styles.progressCount}>{completedCount} / {totalCount} 완료</div>
              </button>
            </div>

            <div className={styles.checklistContainer}>
              {isLoading ? (
                <div className={styles.placeholder}>불러오는 중...</div>
              ) : filteredItems.length === 0 ? (
                <div className={styles.placeholder}>
                  {items.length === 0
                    ? '아직 체크리스트가 없습니다. 30일 계획을 만들면 함께 준비됩니다.'
                    : '조건에 맞는 항목이 없습니다.'}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const status = toFilterStatus(item.status);
                  return (
                    <div key={item.id} className={styles.checklistItem}>
                      <div className={styles.checkboxWrapper}>
                        <input
                          type="checkbox"
                          checked={status === 'DONE'}
                          onChange={() => void toggleCheck(item)}
                          disabled={updatingId !== null}
                          className={styles.checkbox}
                        />
                      </div>
                      <div className={styles.itemContent}>
                        <div className={styles.itemTitle}>{item.title}</div>
                      </div>
                      <div className={styles.itemDay}>
                        {item.dueDay !== null && item.dueDay !== undefined ? `${item.dueDay}일차` : '기한 없음'}
                      </div>
                      <button
                        className={`${styles.itemStatus} ${STATUS_CLASS[status]}`}
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setIsTaskOverviewModalOpen(true);
                        }}
                      >
                        {getDisplayLabel(item.status)}
                      </button>
                      <button
                        className={`${styles.statusActionBtn} ${status === 'DONE' ? styles.undoBtn : ''}`}
                        disabled={updatingId !== null}
                        onClick={() => {
                          if (status === 'DONE') {
                            void changeStatus(item, 'PENDING');
                            return;
                          }
                          setSelectedItemId(item.id);
                          setIsChecklistActionsModalOpen(true);
                        }}
                      >
                        {status === 'DONE' ? <><RotateCcw size={16} /> 되돌리기</> : <><span>상태 변경</span><ChevronDown size={16} /></>}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.footerText}>{filteredItems.length}개 항목 표시 · 전체 {items.length}개</span>
              <button className={styles.filterBtn} onClick={() => setIsFilterOptionsModalOpen(true)}>
                체크리스트 필터
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. 업무 개요 */}
      {isTaskOverviewModalOpen && selectedItem && (
        <Modal
          open
          onClose={() => setIsTaskOverviewModalOpen(false)}
          title="업무 개요"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTaskOverviewModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setIsTaskOverviewModalOpen(false);
                  setIsChecklistActionsModalOpen(true);
                }}
              >
                항목 관리
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.taskCard}>
            <h3 className={styles.taskTitle}>{selectedItem.title}</h3>
            <div className={styles.taskMeta}>
              <span className={styles.tagBadge}>
                {selectedItem.dueDay !== null && selectedItem.dueDay !== undefined ? `${selectedItem.dueDay}일차` : '기한 없음'}
              </span>
              <span className={`${styles.statusBadge} ${STATUS_CLASS[toFilterStatus(selectedItem.status)]}`}>
                {getDisplayLabel(selectedItem.status)}
              </span>
            </div>
          </div>

          <div className={styles.taskDetails}>
            <div className={styles.detailItem}>
              <label>상태</label>
              <span>{getDisplayLabel(selectedItem.status)}</span>
            </div>
            <div className={styles.detailItem}>
              <label>기한</label>
              <span>
                {selectedItem.dueDay !== null && selectedItem.dueDay !== undefined ? `${selectedItem.dueDay}일차` : '기한 없음'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <label>완료 시각</label>
              <span>
                {selectedItem.completedAt
                  ? new Date(selectedItem.completedAt).toLocaleString('ko-KR')
                  : '아직 완료되지 않음'}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. 진행도 상세 */}
      {isProgressDetailModalOpen && (
        <Modal
          open
          onClose={() => setIsProgressDetailModalOpen(false)}
          title="진행도 상세"
          footer={<ModalSecondaryButton onClick={() => setIsProgressDetailModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.progressCard}>
            <div className={styles.progressLabel}>전체 완료율</div>
            <div className={styles.progressValue}>{completionRate}%</div>
            <div className={styles.progressBar}>
              <div style={{ width: `${completionRate}%` }}></div>
            </div>
            <div className={styles.progressDetail}>{completedCount} / {totalCount} 완료</div>
          </div>

          <div className={styles.progressBreakdown}>
            <div className={styles.breakdownItem}>
              <span>완료</span>
              <span className={styles.breakdownValue} style={{ color: '#287456' }}>{counts.DONE}개</span>
            </div>
            <div className={styles.breakdownItem}>
              <span>대기</span>
              <span className={styles.breakdownValue} style={{ color: '#9CA3AF' }}>{counts.PENDING}개</span>
            </div>
            <div className={styles.breakdownItem}>
              <span>건너뜀</span>
              <span className={styles.breakdownValue} style={{ color: '#0765FC' }}>{counts.SKIPPED}개</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. 필터 */}
      {isFilterOptionsModalOpen && (
        <Modal
          open
          onClose={() => setIsFilterOptionsModalOpen(false)}
          title="필터 옵션"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsFilterOptionsModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setActiveTab(filterStatus);
                  setIsFilterOptionsModalOpen(false);
                  showToast('필터가 적용되었습니다.', 'success');
                }}
              >
                필터 적용
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.tabsList}>
            {([
              ['all', `전체 ${items.length}`],
              ['PENDING', `대기 ${counts.PENDING}`],
              ['DONE', `완료 ${counts.DONE}`],
              ['SKIPPED', `건너뜀 ${counts.SKIPPED}`],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                className={styles.tabItem}
                onClick={() => { setFilterStatus(id); setActiveTab(id); setIsFilterOptionsModalOpen(false); }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>상태</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ChecklistFilter)}
              className={styles.select}
            >
              <option value="all">전체</option>
              <option value="PENDING">대기</option>
              <option value="DONE">완료</option>
              <option value="SKIPPED">건너뜀</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>일정</label>
            <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} className={styles.select}>
              <option value="all">전체</option>
              {dayOptions.map((day) => (
                <option key={day} value={String(day)}>{day}일차</option>
              ))}
            </select>
          </div>

          <div className={styles.helpText}>
            <p>필터를 적용하면 조건에 맞는 항목만 표시됩니다.</p>
          </div>
        </Modal>
      )}

      {/* 4. 업무 카테고리 안내 */}
      {isTaskCategoriesModalOpen && (
        <Modal
          open
          onClose={() => setIsTaskCategoriesModalOpen(false)}
          title="업무 카테고리"
          footer={<ModalSecondaryButton onClick={() => setIsTaskCategoriesModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.categoryList}>
            <div className={styles.categoryItem}>
              <h4>계정 및 권한</h4>
              <p>계정 설정과 접근 권한 관련 업무</p>
            </div>
            <div className={styles.categoryItem}>
              <h4>문서 및 자료</h4>
              <p>업무 관련 문서 및 참고 자료</p>
            </div>
            <div className={styles.categoryItem}>
              <h4>업무 규칙</h4>
              <p>부서별 업무 규칙 및 가이드</p>
            </div>
            <div className={styles.categoryItem}>
              <h4>피드백 및 평가</h4>
              <p>진행도 평가 및 피드백</p>
            </div>
          </div>
          <div className={styles.helpText}>
            <p>체크리스트 항목은 30일 계획을 만들 때 함께 준비되며, 기한(일차)에 따라 정렬됩니다.</p>
          </div>
        </Modal>
      )}

      {/* 5. 항목 작업 */}
      {isChecklistActionsModalOpen && selectedItem && (
        <Modal
          open
          onClose={() => setIsChecklistActionsModalOpen(false)}
          title="항목 작업"
          footer={<ModalSecondaryButton onClick={() => setIsChecklistActionsModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.taskCard}>
            <h4>{selectedItem.title}</h4>
            <p style={{ fontSize: '12px', color: '#6B7280' }}>
              {selectedItem.dueDay !== null && selectedItem.dueDay !== undefined ? `${selectedItem.dueDay}일차` : '기한 없음'}
            </p>
          </div>

          <div className={styles.actionList}>
            <button
              className={styles.actionItem}
              disabled={updatingId !== null}
              onClick={() => void changeStatus(selectedItem, NEXT_STATUS[toFilterStatus(selectedItem.status)])}
            >
              다음 상태로 변경 ({getDisplayLabel(NEXT_STATUS[toFilterStatus(selectedItem.status)])})
            </button>
            <button
              className={styles.actionItem}
              onClick={() => {
                setIsChecklistActionsModalOpen(false);
                router.push(`/ai-chat?q=${encodeURIComponent(selectedItem.title + ' 관련 온보딩 질문')}`);
              }}
            >
              🤖 AI에게 관련 업무 질문하기
            </button>
            <button
              className={styles.actionItem}
              onClick={() => {
                setIsChecklistActionsModalOpen(false);
                router.push('/30day-plan');
              }}
            >
              📅 30일 로드맵에서 확인
            </button>
            <button
              className={styles.actionItem}
              onClick={() => {
                setIsChecklistActionsModalOpen(false);
                router.push('/daily-tasks');
              }}
            >
              📝 오늘 할 일에서 보기
            </button>
            <button
              className={styles.actionItem}
              style={{ color: '#0765fc', fontWeight: '600' }}
              disabled={updatingId !== null}
              onClick={() => {
                void changeStatus(selectedItem, 'DONE');
                setIsChecklistActionsModalOpen(false);
              }}
            >
              ✅ 즉시 완료 처리
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
