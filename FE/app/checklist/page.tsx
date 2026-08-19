'use client';

import React, { useState } from 'react';
import { ChevronDown, RotateCcw, Bell, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
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
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  // Modal states
  const [isTaskOverviewModalOpen, setIsTaskOverviewModalOpen] = useState(false);
  const [isProgressDetailModalOpen, setIsProgressDetailModalOpen] = useState(false);
  const [isFilterOptionsModalOpen, setIsFilterOptionsModalOpen] = useState(false);
  const [isChecklistActionsModalOpen, setIsChecklistActionsModalOpen] = useState(false);
  const [isChecklistTabsModalOpen, setIsChecklistTabsModalOpen] = useState(false);
  const [isTaskCategoriesModalOpen, setIsTaskCategoriesModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Selected item state
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState('마케팅팀 인수인계');
  const [notificationCount, setNotificationCount] = useState(7);

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(INITIAL_CHECKLIST_ITEMS);

  const toggleCheck = (id: string) => {
    setChecklistItems((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, status: item.status === 'complete' ? 'pending' : 'complete' }
        : item
    ));
  };

  const filteredItems = checklistItems.filter((item) => {
    const tabMatches = activeTab === 'all' || item.status === activeTab;
    const statusMatches = filterStatus === 'all' || item.status === filterStatus;
    const dayMatches = filterDay === 'all' || item.day === Number(filterDay.replace('day', ''));
    return tabMatches && statusMatches && dayMatches;
  });

  const completedCount = checklistItems.filter((item) => item.status === 'complete').length;
  const completionRate = Math.round((completedCount / checklistItems.length) * 100);

  const updateSelectedItem = (changes: Partial<ChecklistItem>, message: string) => {
    if (!selectedItem) return;
    const updated = { ...selectedItem, ...changes };
    setChecklistItems((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    setSelectedItem(updated);
    showToast(message, 'success');
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
            <button className={styles.workspaceBtn} onClick={() => setIsWorkspaceModalOpen(true)}>
              {selectedWorkspace}
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => setIsNotificationsModalOpen(true)} aria-label="알림 열기">
              <Bell size={20} />
              {notificationCount > 0 && <span className={styles.badge}>{notificationCount}</span>}
            </button>
            <button className={styles.helpBtn} onClick={() => setIsHelpModalOpen(true)} aria-label="도움말 열기">
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
                        showToast('완료 상태를 되돌렸습니다.', 'info');
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
                loading={isPending('checklist-1')}
                onClick={() => run('checklist-1', '필터를 적용했습니다.', () => setIsFilterOptionsModalOpen(false))}
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
            <button className={styles.actionItem} onClick={() => updateSelectedItem({ day: selectedItem.day + 1 }, `${selectedItem.day + 1}일차로 일정을 변경했습니다.`)}>일정 하루 미루기</button>
            <button className={styles.actionItem} onClick={() => updateSelectedItem({ note: selectedItem.note ? undefined : '담당자와 확인이 필요한 항목입니다.' }, selectedItem.note ? '메모를 삭제했습니다.' : '메모를 추가했습니다.')}>{selectedItem.note ? '메모 삭제' : '메모 추가'}</button>
            <button className={styles.actionItem} onClick={() => updateSelectedItem({ reminder: !selectedItem.reminder }, selectedItem.reminder ? '미리 알림을 해제했습니다.' : '내일 오전 9시로 알림을 설정했습니다.')}>{selectedItem.reminder ? '미리 알림 해제' : '미리 알림 설정'}</button>
            <button className={styles.actionItem} style={{ color: '#0765fc' }} onClick={() => {
              updateSelectedItem({ status: 'complete' }, '업무를 완료 처리했습니다.');
              setIsChecklistActionsModalOpen(false);
            }}>완료 처리</button>
          </div>
          {(selectedItem.note || selectedItem.reminder) && (
            <div className={styles.helpText}>
              {selectedItem.note && <p>메모: {selectedItem.note}</p>}
              {selectedItem.reminder && <p>알림: 내일 오전 9시</p>}
            </div>
          )}
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
            {([['all', '전체'], ['pending', '대기'], ['progress', '진행 중'], ['complete', '완료']] as const).map(([id, label]) => (
              <button key={id} className={styles.tabItem} onClick={() => { setActiveTab(id); setIsChecklistTabsModalOpen(false); }}>{label}</button>
            ))}
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

      {isWorkspaceModalOpen && (
        <Modal
          open
          onClose={() => setIsWorkspaceModalOpen(false)}
          title="워크스페이스 선택"
          footer={<ModalSecondaryButton onClick={() => setIsWorkspaceModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.actionList}>
            {['마케팅팀 인수인계', '개발팀 온보딩', '신규 입사자 공통'].map((workspace) => (
              <button
                key={workspace}
                className={styles.actionItem}
                onClick={() => {
                  setSelectedWorkspace(workspace);
                  setIsWorkspaceModalOpen(false);
                  showToast(`${workspace}(으)로 변경했습니다.`, 'success');
                }}
              >
                {workspace}{selectedWorkspace === workspace ? ' · 선택됨' : ''}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {isNotificationsModalOpen && (
        <Modal
          open
          onClose={() => setIsNotificationsModalOpen(false)}
          title="알림"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsNotificationsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton onClick={() => { setNotificationCount(0); showToast('모든 알림을 확인했습니다.', 'success'); }}>모두 읽음</ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.actionList}>
            <button className={styles.actionItem} onClick={() => { setActiveTab('progress'); setIsNotificationsModalOpen(false); }}>진행 중인 업무 1개를 확인해 주세요.</button>
            <button className={styles.actionItem} onClick={() => { setActiveTab('pending'); setIsNotificationsModalOpen(false); }}>마감 예정 업무를 확인해 주세요.</button>
            <button className={styles.actionItem} onClick={() => { setIsProgressDetailModalOpen(true); setIsNotificationsModalOpen(false); }}>현재 완료율이 {completionRate}%입니다.</button>
          </div>
        </Modal>
      )}

      {isHelpModalOpen && (
        <Modal
          open
          onClose={() => setIsHelpModalOpen(false)}
          title="체크리스트 도움말"
          footer={<ModalSecondaryButton onClick={() => setIsHelpModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.helpText}>
            <p>체크박스를 선택하면 업무가 바로 완료 처리됩니다. 상태 변경에서는 진행 중 전환, 일정 변경, 메모와 알림 설정을 할 수 있습니다.</p>
          </div>
          <div className={styles.actionList}>
            <button className={styles.actionItem} onClick={() => { setIsHelpModalOpen(false); setIsChecklistTabsModalOpen(true); }}>상태별 목록 보기</button>
            <button className={styles.actionItem} onClick={() => { setIsHelpModalOpen(false); setIsTaskCategoriesModalOpen(true); }}>업무 카테고리 안내</button>
            <button className={styles.actionItem} onClick={() => { setIsHelpModalOpen(false); setIsFilterOptionsModalOpen(true); }}>필터 설정 열기</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
