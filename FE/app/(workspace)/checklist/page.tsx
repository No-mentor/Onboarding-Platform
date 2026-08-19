'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, RotateCcw, Bell, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import { getChecklists, updateChecklistItemStatus } from '@/lib/api';
import styles from './checklist.module.css';

export default function ChecklistPage() {
  const router = useRouter();
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isTaskOverviewModalOpen, setIsTaskOverviewModalOpen] = useState(false);
  const [isProgressDetailModalOpen, setIsProgressDetailModalOpen] = useState(false);
  const [isFilterOptionsModalOpen, setIsFilterOptionsModalOpen] = useState(false);
  const [isChecklistActionsModalOpen, setIsChecklistActionsModalOpen] = useState(false);
  const [isChecklistTabsModalOpen, setIsChecklistTabsModalOpen] = useState(false);
  const [isTaskCategoriesModalOpen, setIsTaskCategoriesModalOpen] = useState(false);

  // Selected item state
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [checklistItems, setChecklistItems] = useState<any[]>([]);

  // Load checklists on mount
  const loadChecklists = async () => {
    try {
      setIsLoading(true);
      const response = await getChecklists();
      const rawItems = response.items || [];
      const items = rawItems.map((item: any) => {
        const isDone = item.status === 'DONE' || item.status === 'COMPLETED' || item.status === 'done';
        return {
          ...item,
          isDone,
          day: item.dueDay ? `Day ${item.dueDay}` : (item.day ? `Day ${item.day}` : 'Day 1'),
          statusText: isDone ? '완료' : '대기',
          statusColor: isDone ? '#10B981' : '#F59E0B',
        };
      });
      setChecklistItems(items);
      setCheckedItems(items.filter((i: any) => i.isDone).map((i: any) => i.id));
    } catch (err) {
      console.error('체크리스트 로드 실패:', err);
      showToast('체크리스트를 불러올 수 없습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChecklists();
  }, []);

  const toggleCheck = async (item: any) => {
    const isCurrentlyDone = checkedItems.includes(item.id);
    const nextStatus = isCurrentlyDone ? 'IN_PROGRESS' : 'COMPLETED';

    try {
      if (item.id) {
        await updateChecklistItemStatus(item.id, nextStatus);
      }
      setCheckedItems((prev) =>
        isCurrentlyDone ? prev.filter((id) => id !== item.id) : [...prev, item.id]
      );
      setChecklistItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                isDone: !isCurrentlyDone,
                status: nextStatus,
                statusText: !isCurrentlyDone ? '완료' : '대기',
                statusColor: !isCurrentlyDone ? '#10B981' : '#F59E0B',
              }
            : i
        )
      );
      showToast(!isCurrentlyDone ? `'${item.title}' 완료 처리되었습니다! 🎉` : `'${item.title}' 대기 상태로 변경되었습니다.`, 'success');
    } catch (err: any) {
      showToast(err.message || '상태 변경 실패', 'error');
    }
  };

  const filteredItems = checklistItems.filter((item) => {
    const isChecked = checkedItems.includes(item.id);
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return !isChecked;
    if (activeTab === 'complete') return isChecked;
    return true;
  });

  const doneCount = checklistItems.filter(i => checkedItems.includes(i.id)).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className={styles.layout}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>체크리스트</h1>
            <p className={styles.subtitle}>상태별로 필터링하고 완료 여부를 바로 확인하세요.</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.workspaceBtn} onClick={() => router.push('/workspace-selection')}>
              워크스페이스 전환
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')}>
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
                전체 ({totalCount})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                대기 ({totalCount - doneCount})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'complete' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('complete')}
              >
                완료 ({doneCount})
              </button>
            </div>

            <div className={styles.progressInfo}>
              <div className={styles.progressLabel}>완료율</div>
              <div className={styles.progressValue}>{progressPercent}%</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className={styles.progressCount}>{doneCount} / {totalCount} 완료</div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>업무 체크리스트</h2>
            </div>

            <div className={styles.checklistContainer}>
              {isLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>체크리스트 불러오는 중...</div>
              ) : filteredItems.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>항목이 없습니다.</div>
              ) : (
                filteredItems.map((item) => {
                  const isChecked = checkedItems.includes(item.id);
                  return (
                    <div key={item.id} className={styles.checklistItem}>
                      <div className={styles.checkboxWrapper}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(item)}
                          className={styles.checkbox}
                        />
                      </div>
                      <div className={styles.itemContent}>
                        <div className={styles.itemTitle} style={{ textDecoration: isChecked ? 'line-through' : 'none', color: isChecked ? '#9CA3AF' : '#111827' }}>
                          {item.title}
                        </div>
                      </div>
                      <div className={styles.itemDay}>{item.day}</div>
                      <div
                        className={styles.itemStatus}
                        style={{ color: isChecked ? '#10B981' : '#F59E0B', cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedItem(item);
                          setIsTaskOverviewModalOpen(true);
                        }}
                      >
                        {isChecked ? '완료' : '대기'}
                      </div>
                      <button
                        className={styles.refreshBtn}
                        onClick={() => {
                          setSelectedItem(item);
                          setIsChecklistActionsModalOpen(true);
                        }}
                        title="항목 옵션"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.footerText}>전체 {totalCount}개 항목</span>
              <button className={styles.filterBtn} onClick={() => setIsProgressDetailModalOpen(true)}>
                진행도 자세히 보기 →
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
                  toggleCheck(selectedItem);
                  setIsTaskOverviewModalOpen(false);
                }}
              >
                {checkedItems.includes(selectedItem.id) ? '대기 상태로 변경' : '완료로 표시'}
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.taskCard}>
            <h3 className={styles.taskTitle}>{selectedItem.title}</h3>
            <div className={styles.taskMeta}>
              <span className={styles.tagBadge}>{selectedItem.day}</span>
              <span className={styles.statusBadge} style={{ color: checkedItems.includes(selectedItem.id) ? '#10B981' : '#F59E0B' }}>
                {checkedItems.includes(selectedItem.id) ? '완료됨' : '대기 중'}
              </span>
            </div>
          </div>

          <div className={styles.taskDetails}>
            <div className={styles.detailItem}>
              <label>상태</label>
              <span>{checkedItems.includes(selectedItem.id) ? '완료' : '대기'}</span>
            </div>
            <div className={styles.detailItem}>
              <label>일정</label>
              <span>{selectedItem.day}</span>
            </div>
            <div className={styles.detailItem}>
              <label>등록일</label>
              <span>{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString() : '진행 중'}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Progress Detail Modal */}
      {isProgressDetailModalOpen && (
        <Modal
          open
          onClose={() => setIsProgressDetailModalOpen(false)}
          title="체크리스트 진행도 상세"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsProgressDetailModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.progressCard}>
            <div className={styles.progressLabel}>전체 완료율</div>
            <div className={styles.progressValue} style={{ color: '#4F46E5', fontWeight: 700 }}>{progressPercent}%</div>
            <div className={styles.progressBar}>
              <div style={{ width: `${progressPercent}%`, backgroundColor: '#4F46E5' }}></div>
            </div>
            <div className={styles.progressDetail}>{doneCount} / {totalCount} 완료</div>
          </div>

          <div className={styles.progressBreakdown}>
            <div className={styles.breakdownItem}>
              <span>완료</span>
              <span className={styles.breakdownValue} style={{ color: '#10B981' }}>{doneCount}개</span>
            </div>
            <div className={styles.breakdownItem}>
              <span>대기 중</span>
              <span className={styles.breakdownValue} style={{ color: '#F59E0B' }}>{totalCount - doneCount}개</span>
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
              <option value="pending">대기 중 항목</option>
              <option value="complete">완료된 항목</option>
            </select>
          </div>

          <div className={styles.helpText} style={{ marginTop: '16px' }}>
            <p>필터를 적용하면 선택한 조건의 체크리스트 항목만 정렬되어 표시됩니다.</p>
          </div>
        </Modal>
      )}

      {/* 4. Checklist Actions Modal */}
      {isChecklistActionsModalOpen && selectedItem && (
        <Modal
          open
          onClose={() => setIsChecklistActionsModalOpen(false)}
          title="체크리스트 작업"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsChecklistActionsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.taskCard}>
            <h3 className={styles.taskTitle}>{selectedItem.title}</h3>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>{selectedItem.day}</p>
          </div>

          <div className={styles.actionList}>
            <button
              className={styles.actionItem}
              onClick={() => {
                toggleCheck(selectedItem);
                setIsChecklistActionsModalOpen(false);
              }}
            >
              {checkedItems.includes(selectedItem.id) ? '대기 상태로 변경' : '완료 처리하기'}
            </button>
            <button
              className={styles.actionItem}
              onClick={() => {
                setIsChecklistActionsModalOpen(false);
                router.push(`/ai-chat?q=${encodeURIComponent(selectedItem.title)}`);
              }}
            >
              AI에게 관련 업무 질문하기
            </button>
            <button
              className={styles.actionItem}
              onClick={() => {
                setIsChecklistActionsModalOpen(false);
                router.push('/30day-plan');
              }}
            >
              30일 계획에서 일정 확인
            </button>
            <button
              className={styles.actionItem}
              onClick={() => {
                setIsChecklistActionsModalOpen(false);
                router.push('/daily-tasks');
              }}
            >
              오늘 할 일에서 보기
            </button>
          </div>
        </Modal>
      )}

      {/* 5. Checklist Tabs Modal */}
      {isChecklistTabsModalOpen && (
        <Modal
          open
          onClose={() => setIsChecklistTabsModalOpen(false)}
          title="체크리스트 탭 전환"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsChecklistTabsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.tabsList}>
            <button
              className={`${styles.tabItem} ${activeTab === 'all' ? styles.tabActive : ''}`}
              onClick={() => {
                setActiveTab('all');
                setIsChecklistTabsModalOpen(false);
              }}
            >
              전체 보기 ({totalCount})
            </button>
            <button
              className={`${styles.tabItem} ${activeTab === 'pending' ? styles.tabActive : ''}`}
              onClick={() => {
                setActiveTab('pending');
                setIsChecklistTabsModalOpen(false);
              }}
            >
              대기 중 항목 ({totalCount - doneCount})
            </button>
            <button
              className={`${styles.tabItem} ${activeTab === 'complete' ? styles.tabActive : ''}`}
              onClick={() => {
                setActiveTab('complete');
                setIsChecklistTabsModalOpen(false);
              }}
            >
              완료된 항목 ({doneCount})
            </button>
          </div>
        </Modal>
      )}

      {/* 6. Task Categories Modal */}
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
        </Modal>
      )}
    </div>
  );
}
