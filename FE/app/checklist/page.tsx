'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, RotateCcw, Bell, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getChecklists, updateChecklistItemStatus, ChecklistSummaryResponse, ChecklistItemResponse } from '@/lib/api';
import styles from './checklist.module.css';

type ChecklistStatus = 'pending' | 'progress' | 'complete';

interface ChecklistItem {
  id: string;
  title: string;
  day: number;
  status: ChecklistStatus;
  note?: string;
  reminder?: boolean;
}

const INITIAL_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'task-1', title: '필수 계정 및 권한 확인', day: 1, status: 'complete' },
  { id: 'task-2', title: '주간회의 자료 위치 파악', day: 1, status: 'complete' },
  { id: 'task-3', title: '예산안 작성 규칙 확인', day: 2, status: 'progress' },
  { id: 'task-4', title: '거래처 연락망 최신화', day: 3, status: 'pending' },
  { id: 'task-5', title: '마케팅 결과 보고 템플릿 확인', day: 4, status: 'pending' },
  { id: 'task-6', title: '첫 주 인수인계 피드백 작성', day: 5, status: 'pending' },
  { id: 'task-7', title: '브랜드 가이드 확인', day: 6, status: 'complete' },
  { id: 'task-8', title: '광고 계정 접근 권한 확인', day: 7, status: 'complete' },
  { id: 'task-9', title: '월간 성과 지표 확인', day: 8, status: 'complete' },
  { id: 'task-10', title: '콘텐츠 검수 절차 확인', day: 9, status: 'complete' },
  { id: 'task-11', title: '협업 도구 알림 설정', day: 10, status: 'complete' },
  { id: 'task-12', title: '온보딩 회고 작성', day: 12, status: 'pending' },
];

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  pending: '대기',
  progress: '진행 중',
  complete: '완료',
};

export default function ChecklistPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  // Modal states
  const [isTaskOverviewModalOpen, setIsTaskOverviewModalOpen] = useState(false);
  const [isProgressDetailModalOpen, setIsProgressDetailModalOpen] = useState(false);
  const [isFilterOptionsModalOpen, setIsFilterOptionsModalOpen] = useState(false);
  const [isChecklistActionsModalOpen, setIsChecklistActionsModalOpen] = useState(false);
  const [isChecklistTabsModalOpen, setIsChecklistTabsModalOpen] = useState(false);
  const [isTaskCategoriesModalOpen, setIsTaskCategoriesModalOpen] = useState(false);

  // Selected item state
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(INITIAL_CHECKLIST_ITEMS);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchChecklists = async () => {
    try {
      setIsLoading(true);
      const res: ChecklistSummaryResponse = await getChecklists();
      if (res && res.items && res.items.length > 0) {
        const mapped: ChecklistItem[] = res.items.map((item: ChecklistItemResponse, idx: number) => ({
          id: item.id || `task-${idx + 1}`,
          title: item.title,
          day: (idx % 12) + 1,
          status: item.status === 'COMPLETED' ? 'complete' : item.status === 'IN_PROGRESS' ? 'progress' : 'pending',
        }));
        setChecklistItems(mapped);
      }
    } catch (err) {
      console.log('실제 체크리스트 조회 실패 (모의 데이터로 유지):', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  const toggleCheck = async (id: string) => {
    const target = checklistItems.find((i) => i.id === id);
    if (!target) return;
    const newStatus: ChecklistStatus = target.status === 'complete' ? 'pending' : 'complete';

    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );

    if (!id.startsWith('task-')) {
      try {
        const apiStatus = newStatus === 'complete' ? 'COMPLETED' : 'NOT_STARTED';
        await updateChecklistItemStatus(id, apiStatus);
        showToast(newStatus === 'complete' ? '체크리스트 항목을 완료했습니다.' : '완료 상태를 되돌렸습니다.', 'success');
      } catch (err) {
        showToast('상태 변경 실패', 'error');
        fetchChecklists();
      }
    } else {
      showToast(newStatus === 'complete' ? '체크리스트 항목을 완료했습니다.' : '완료 상태를 되돌렸습니다.', 'info');
    }
  };

  const filteredItems = checklistItems.filter((item) => {
    const tabMatches = activeTab === 'all' || item.status === activeTab;
    const statusMatches = filterStatus === 'all' || item.status === filterStatus;
    const dayMatches = filterDay === 'all' || item.day === Number(filterDay.replace('day', ''));
    return tabMatches && statusMatches && dayMatches;
  });

  const completedCount = checklistItems.filter((item) => item.status === 'complete').length;
  const completionRate = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

  const updateSelectedItem = async (changes: Partial<ChecklistItem>, message: string) => {
    if (!selectedItem) return;
    const updated = { ...selectedItem, ...changes };
    setChecklistItems((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    setSelectedItem(updated);
    showToast(message, 'success');

    if (changes.status && !selectedItem.id.startsWith('task-')) {
      try {
        const apiStatus = changes.status === 'complete' ? 'COMPLETED' : changes.status === 'progress' ? 'IN_PROGRESS' : 'NOT_STARTED';
        await updateChecklistItemStatus(selectedItem.id, apiStatus);
      } catch (e) {
        console.log('상태 변경 오류:', e);
      }
    }
  };

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
              <span>마케팅팀 인수인계</span>
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')} aria-label="알림 열기" title="알림 센터">
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')} aria-label="도움말 열기" title="AI 어시스턴트">
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {/* Tabs */}
          <div className={styles.tabsContainer}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('all')}
              >
                전체 ({checklistItems.length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                대기 ({checklistItems.filter((i) => i.status === 'pending').length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'progress' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('progress')}
              >
                진행 중 ({checklistItems.filter((i) => i.status === 'progress').length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'complete' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('complete')}
              >
                완료 ({completedCount})
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
                <div className={styles.progressCount}>{completedCount} / {checklistItems.length} 완료</div>
              </button>
            </div>

            <div className={styles.checklistContainer}>
              {filteredItems.map((item) => (
                <div key={item.id} className={styles.checklistItem}>
                  <div className={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      checked={item.status === 'complete'}
                      onChange={() => toggleCheck(item.id)}
                      className={styles.checkbox}
                    />
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.itemTitle}>{item.title}</div>
                  </div>
                  <div className={styles.itemDay}>{item.day}일차</div>
                  <button
                    className={`${styles.itemStatus} ${styles[`status_${item.status}`]}`}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsTaskOverviewModalOpen(true);
                    }}
                  >
                    {STATUS_LABELS[item.status]}
                  </button>
                  <button
                    className={`${styles.statusActionBtn} ${item.status === 'complete' ? styles.undoBtn : ''}`}
                    onClick={() => {
                      if (item.status === 'complete') {
                        toggleCheck(item.id);
                        return;
                      }
                      setSelectedItem(item);
                      setIsChecklistActionsModalOpen(true);
                    }}
                  >
                    {item.status === 'complete' ? <><RotateCcw size={16} /> 되돌리기</> : <><span>상태 변경</span><ChevronDown size={16} /></>}
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.footerText}>{filteredItems.length}개 항목 표시 · 전체 {checklistItems.length}개</span>
              <button className={styles.filterBtn} onClick={() => setIsFilterOptionsModalOpen(true)}>
                체크리스트 필터
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. Task Overview Modal */}
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
              <span className={styles.tagBadge}>{selectedItem.day}일차</span>
              <span className={`${styles.statusBadge} ${styles[`status_${selectedItem.status}`]}`}>
                {STATUS_LABELS[selectedItem.status as ChecklistStatus]}
              </span>
            </div>
          </div>

          <div className={styles.taskDetails}>
            <div className={styles.detailItem}>
              <label>상태</label>
              <span>{STATUS_LABELS[selectedItem.status as ChecklistStatus]}</span>
            </div>
            <div className={styles.detailItem}>
              <label>일정</label>
              <span>{selectedItem.day}일차</span>
            </div>
            <div className={styles.detailItem}>
              <label>완료율</label>
              <span>{selectedItem.status === 'complete' ? '100%' : selectedItem.status === 'progress' ? '50%' : '0%'}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Progress Detail Modal */}
      {isProgressDetailModalOpen && (
        <Modal
          open
          onClose={() => setIsProgressDetailModalOpen(false)}
          title="진행도 상세"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsProgressDetailModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.progressCard}>
            <div className={styles.progressLabel}>전체 완료율</div>
            <div className={styles.progressValue}>{completionRate}%</div>
            <div className={styles.progressBar}>
              <div style={{ width: `${completionRate}%` }}></div>
            </div>
            <div className={styles.progressDetail}>{completedCount} / {checklistItems.length} 완료</div>
          </div>

          <div className={styles.progressBreakdown}>
            <div className={styles.breakdownItem}>
              <span>완료</span>
              <span className={styles.breakdownValue} style={{ color: '#287456' }}>{completedCount}개</span>
            </div>
            <div className={styles.breakdownItem}>
              <span>진행 중</span>
              <span className={styles.breakdownValue} style={{ color: '#0765FC' }}>{checklistItems.filter((item) => item.status === 'progress').length}개</span>
            </div>
            <div className={styles.breakdownItem}>
              <span>대기</span>
              <span className={styles.breakdownValue} style={{ color: '#9CA3AF' }}>{checklistItems.filter((item) => item.status === 'pending').length}개</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Filter Options Modal */}
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
                  if (filterStatus === 'pending') setActiveTab('pending');
                  else if (filterStatus === 'complete') setActiveTab('complete');
                  else if (filterStatus === 'progress') setActiveTab('progress');
                  else setActiveTab('all');
                  setIsFilterOptionsModalOpen(false);
                  showToast('필터가 적용되었습니다.', 'success');
                }}
              >
                필터 적용
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>상태</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.select}>
              <option value="all">전체</option>
              <option value="pending">대기</option>
              <option value="progress">진행 중</option>
              <option value="complete">완료</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>일정</label>
            <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} className={styles.select}>
              <option value="all">전체</option>
              <option value="day1">1일차</option>
              <option value="day2">2일차</option>
              <option value="day3">3일차</option>
              <option value="day4">4일차</option>
              <option value="day5">5일차</option>
              <option value="day6">6일차</option>
              <option value="day7">7일차</option>
              <option value="day8">8일차</option>
              <option value="day9">9일차</option>
              <option value="day10">10일차</option>
              <option value="day12">12일차</option>
            </select>
          </div>

          <div className={styles.helpText}>
            <p>필터를 적용하면 조건에 맞는 항목만 표시됩니다.</p>
          </div>
        </Modal>
      )}

      {/* 4. Checklist Actions Modal */}
      {isChecklistActionsModalOpen && selectedItem && (
        <Modal
          open
          onClose={() => setIsChecklistActionsModalOpen(false)}
          title="항목 작업"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsChecklistActionsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.taskCard}>
            <h4>{selectedItem.title}</h4>
            <p style={{ fontSize: '12px', color: '#6B7280' }}>{selectedItem.day}일차</p>
          </div>

          <div className={styles.actionList}>
            <button className={styles.actionItem} onClick={() => {
              const nextStatus: ChecklistStatus = selectedItem.status === 'pending' ? 'progress' : selectedItem.status === 'progress' ? 'complete' : 'pending';
              updateSelectedItem({ status: nextStatus }, `상태를 '${STATUS_LABELS[nextStatus]}'(으)로 변경했습니다.`);
            }}>다음 상태로 변경</button>
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
            <button className={styles.actionItem} style={{ color: '#0765fc', fontWeight: '600' }} onClick={() => {
              updateSelectedItem({ status: 'complete' }, '업무를 완료 처리했습니다.');
              setIsChecklistActionsModalOpen(false);
            }}>
              ✅ 즉시 완료 처리
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}