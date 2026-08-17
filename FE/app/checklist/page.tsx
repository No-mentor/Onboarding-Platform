'use client';

import React, { useState } from 'react';
import { ChevronDown, RotateCcw, Bell, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import styles from './checklist.module.css';

export default function ChecklistPage() {
  const { run, isPending } = useModalAction();
  const [activeTab, setActiveTab] = useState('all');
  const [checkedItems, setCheckedItems] = useState<number[]>([1, 2]);

  // Modal states
  const [isTaskOverviewModalOpen, setIsTaskOverviewModalOpen] = useState(false);
  const [isProgressDetailModalOpen, setIsProgressDetailModalOpen] = useState(false);
  const [isFilterOptionsModalOpen, setIsFilterOptionsModalOpen] = useState(false);
  const [isChecklistActionsModalOpen, setIsChecklistActionsModalOpen] = useState(false);
  const [isChecklistTabsModalOpen, setIsChecklistTabsModalOpen] = useState(false);
  const [isTaskCategoriesModalOpen, setIsTaskCategoriesModalOpen] = useState(false);

  // Selected item state
  const [selectedItem, setSelectedItem] = useState<typeof checklistItems[0] | null>(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDay, setFilterDay] = useState('all');

  const checklistItems = [
    {
      id: 1,
      title: '팀수 계정 및 권한 확인',
      day: 'DAY 1',
      status: 'complete',
      statusText: '완료',
      statusColor: '#10B981',
    },
    {
      id: 2,
      title: '주간의 자료 위치 파악',
      day: 'DAY 1',
      status: 'complete',
      statusText: '완료',
      statusColor: '#10B981',
    },
    {
      id: 3,
      title: '예산안 작성 규칙 확인',
      day: 'DAY 2',
      status: 'pending',
      statusText: '진행 중',
      statusColor: '#0066FF',
    },
    {
      id: 4,
      title: '거래처 연락망 최신화',
      day: 'DAY 3',
      status: 'pending',
      statusText: '대기',
      statusColor: '#9CA3AF',
    },
    {
      id: 5,
      title: '마케팅 결과 보고 템플릿 확인',
      day: 'DAY 4',
      status: 'pending',
      statusText: '대기',
      statusColor: '#9CA3AF',
    },
    {
      id: 6,
      title: '첫 주 인수인계 피드백 작성',
      day: 'DAY 5',
      status: 'pending',
      statusText: '대기',
      statusColor: '#9CA3AF',
    },
  ];

  const toggleCheck = (id: number) => {
    setCheckedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredItems = checklistItems.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return item.status === 'pending';
    if (activeTab === 'complete') return item.status === 'complete';
    return true;
  });

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
            <button className={styles.workspaceBtn}>
              마케팅팀 인수인계
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn}>
              <Bell size={20} />
              <span className={styles.badge}>7</span>
            </button>
            <button className={styles.helpBtn}>
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
                전체
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                대기
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'progress' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('progress')}
              >
                진행 중
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'complete' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('complete')}
              >
                완료
              </button>
            </div>

            <div className={styles.progressInfo}>
              <div className={styles.progressLabel}>완료율</div>
              <div className={styles.progressValue}>58%</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: '58%' }}></div>
              </div>
              <div className={styles.progressCount}>7 / 12 완료</div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>업무 체크리스트</h2>
            </div>

            <div className={styles.checklistContainer}>
              {filteredItems.map((item) => (
                <div key={item.id} className={styles.checklistItem}>
                  <div className={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      checked={checkedItems.includes(item.id)}
                      onChange={() => toggleCheck(item.id)}
                      className={styles.checkbox}
                    />
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.itemTitle}>{item.title}</div>
                  </div>
                  <div className={styles.itemDay}>{item.day}</div>
                  <div
                    className={styles.itemStatus}
                    style={{ color: item.statusColor, cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsTaskOverviewModalOpen(true);
                    }}
                  >
                    {item.statusText}
                  </div>
                  <button
                    className={styles.refreshBtn}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsChecklistActionsModalOpen(true);
                    }}
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.footerText}>전체 12개 항목</span>
              <button className={styles.filterBtn} onClick={() => setIsFilterOptionsModalOpen(true)}>
                Checklist filters
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
                loading={isPending('checklist-0')}
                onClick={() => run('checklist-0', '처리를 완료했습니다.', () => setIsTaskOverviewModalOpen(false))}
              >
                상세 보기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.taskCard}>
            <h3 className={styles.taskTitle}>{selectedItem.title}</h3>
            <div className={styles.taskMeta}>
              <span className={styles.tagBadge}>{selectedItem.day}</span>
              <span className={styles.statusBadge} style={{ color: selectedItem.statusColor }}>
                {selectedItem.statusText}
              </span>
            </div>
          </div>

          <div className={styles.taskDetails}>
            <div className={styles.detailItem}>
              <label>상태</label>
              <span>{selectedItem.statusText}</span>
            </div>
            <div className={styles.detailItem}>
              <label>일정</label>
              <span>{selectedItem.day}</span>
            </div>
            <div className={styles.detailItem}>
              <label>완료율</label>
              <span>100%</span>
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
            <div className={styles.progressValue}>58%</div>
            <div className={styles.progressBar}>
              <div style={{ width: '58%' }}></div>
            </div>
            <div className={styles.progressDetail}>7 / 12 완료</div>
          </div>

          <div className={styles.progressBreakdown}>
            <div className={styles.breakdownItem}>
              <span>완료</span>
              <span className={styles.breakdownValue} style={{ color: '#10B981' }}>7개</span>
            </div>
            <div className={styles.breakdownItem}>
              <span>진행 중</span>
              <span className={styles.breakdownValue} style={{ color: '#0066FF' }}>2개</span>
            </div>
            <div className={styles.breakdownItem}>
              <span>대기</span>
              <span className={styles.breakdownValue} style={{ color: '#9CA3AF' }}>3개</span>
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
                loading={isPending('checklist-1')}
                onClick={() => run('checklist-1', '처리를 완료했습니다.', () => setIsFilterOptionsModalOpen(false))}
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
              <option value="day1">DAY 1</option>
              <option value="day2">DAY 2</option>
              <option value="day3">DAY 3</option>
              <option value="day4">DAY 4</option>
              <option value="day5">DAY 5</option>
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
            <p style={{ fontSize: '12px', color: '#6B7280' }}>{selectedItem.day}</p>
          </div>

          <div className={styles.actionList}>
            <button className={styles.actionItem}>상태 업데이트</button>
            <button className={styles.actionItem}>일정 변경</button>
            <button className={styles.actionItem}>메모 추가</button>
            <button className={styles.actionItem}>미리 알림 설정</button>
            <button className={styles.actionItem} style={{ color: '#dc2626' }}>완료 처리</button>
          </div>
        </Modal>
      )}

      {/* 5. Checklist Tabs Modal */}
      {isChecklistTabsModalOpen && (
        <Modal
          open
          onClose={() => setIsChecklistTabsModalOpen(false)}
          title="체크리스트 탭"
          footer={
            <>
              <ModalPrimaryButton
                loading={isPending('checklist-2')}
                onClick={() => run('checklist-2', '처리를 완료했습니다.', () => setIsChecklistTabsModalOpen(false))}
              >
                완료
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.tabsList}>
            <button className={styles.tabItem}>전체</button>
            <button className={styles.tabItem}>대기</button>
            <button className={styles.tabItem}>진행 중</button>
            <button className={styles.tabItem}>완료</button>
          </div>

          <div className={styles.helpText}>
            <p>상태별로 항목을 필터링하여 관리하세요.</p>
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
