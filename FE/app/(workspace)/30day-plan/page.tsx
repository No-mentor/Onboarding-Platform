'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Zap, Bell, HelpCircle, Check } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import { getOnboardingPlan, generateOnboardingPlan } from '@/lib/api';
import styles from './30day-plan.module.css';

export default function ThirtyDayPlanPage() {
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [selectedTab, setSelectedTab] = useState('all');
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isWeekDetailsModalOpen, setIsWeekDetailsModalOpen] = useState(false);
  const [isDaySummaryModalOpen, setIsDaySummaryModalOpen] = useState(false);
  const [isPlanGenerationModalOpen, setIsPlanGenerationModalOpen] = useState(false);
  const [isCompletionStatusModalOpen, setIsCompletionStatusModalOpen] = useState(false);
  const [isPlanEditModalOpen, setIsPlanEditModalOpen] = useState(false);
  const [isTaskBreakdownModalOpen, setIsTaskBreakdownModalOpen] = useState(false);
  const [isPlanActionModalOpen, setIsPlanActionModalOpen] = useState(false);

  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState('1week');
  const [days, setDays] = useState<any[]>([]);

  // Load plan on mount
  useEffect(() => {
    const loadPlan = async () => {
      try {
        setIsLoading(true);
        let response = await getOnboardingPlan(true);

        // 계획이 없으면 생성
        if (!response) {
          console.log('계획이 없어 새로 생성합니다');
          response = await generateOnboardingPlan();
        }

        const items = response.items || [];
        setDays(items);
        showToast('계획이 로드되었습니다', 'success');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '계획을 로드할 수 없습니다';
        console.error('계획 로드 실패:', err);

        // 404 에러 (계획 없음) 인 경우 자동으로 생성 시도
        if (errorMsg.includes('온보딩 계획이 없습니다') || errorMsg.includes('계획 조회 실패')) {
          try {
            console.log('계획 생성 시작...');
            const generatedResponse = await generateOnboardingPlan();
            const items = generatedResponse.items || [];
            setDays(items);
            showToast('계획이 생성되었습니다', 'success');
          } catch (generateErr) {
            console.error('계획 생성 실패:', generateErr);
            showToast('계획 생성에 실패했습니다', 'error');
          }
        } else {
          showToast(errorMsg, 'error');
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadPlan();
  }, [showToast]);

  const toggleDayExpanded = (day: number) => {
    setExpandedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className={styles.container}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>30 일 인수인계 계획</h1>
            <p className={styles.description}>AI 가 생성한 계획을 원자재 확인하고 향후 상태를 관리하세요.</p>
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
          {/* Tabs */}
          <div className={styles.tabsBar}>
            <div className={styles.tabs}>
              {['all', '1week', '2week', '3week', '4week'].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${selectedTab === tab ? styles.activeTab : ''}`}
                  onClick={() => setSelectedTab(tab)}
                >
                  {tab === 'all' ? '전체 30 일' : tab === '1week' ? '1 주차' : tab === '2week' ? '2 주차' : tab === '3week' ? '3 주차' : '4 주차'}
                </button>
              ))}
            </div>
            <div className={styles.tabActions}>
              <button className={styles.refreshBtn} onClick={() => setIsPlanGenerationModalOpen(true)}>계획 재생성</button>
              <button className={styles.createBtn} onClick={() => setIsPlanGenerationModalOpen(true)}>
                <Plus size={16} /> 계획 생성
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.timeline}>
            {days.map((item, idx) => {
              const isExpanded = expandedDays.includes(item.dayIndex);
              return (
                <div key={item.id} className={styles.timelineItem}>
                  <div className={styles.timelineMarker}>
                    <div className={`${styles.dot} ${item.status === 'COMPLETED' ? styles.completed : ''}`}>
                      {item.status === 'COMPLETED' && <Check size={14} className={styles.checkmark} />}
                    </div>
                    {idx < days.length - 1 && <div className={styles.line} />}
                  </div>

                  <div className={styles.content}>
                    <div
                      className={styles.contentHeader}
                      onClick={() => {
                        setSelectedDay(item);
                        setIsDaySummaryModalOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className={styles.dayLabel}>DAY {item.dayIndex}</span>
                      <h3 className={styles.dayTitle}>{item.title}</h3>
                    </div>

                    {isExpanded && (
                      <div className={styles.dayItems}>
                        {item.description && <span>{item.description}</span>}
                        {item.personName && <span>담당자: {item.personName}</span>}
                      </div>
                    )}

                    <div className={styles.progressArea}>
                      <span className={styles.progressPercent}>{item.status}</span>
                      <button
                        className={styles.expandBtn}
                        onClick={() => toggleDayExpanded(item.dayIndex)}
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease'
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className={styles.footerInfo}>
            <div className={styles.infoItem}>
              <span>관리자는 항목 완료 (keepCompleted) 를 선택해</span>
            </div>
            <div className={styles.infoItem}>
              <span>계획을 재생성할 수 있습니다.</span>
            </div>
          </div>

          {/* Generate Button */}
          <button className={styles.generateBtn} onClick={() => setIsPlanActionModalOpen(true)}>
            <Zap size={16} /> Generate / Regenerate
          </button>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. Week Details Modal */}
      {isWeekDetailsModalOpen && (
        <Modal
          open
          onClose={() => setIsWeekDetailsModalOpen(false)}
          title="주차별 상세"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsWeekDetailsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('30day-plan-0')}
                onClick={() => run('30day-plan-0', '처리를 완료했습니다.', () => setIsWeekDetailsModalOpen(false))}
              >
                편집
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.weekCard}>
            <div className={styles.weekHeader}>
              <span className={styles.weekLabel}>1주차 (DAY 1-7)</span>
              <span className={styles.weekProgress}>40% 완료</span>
            </div>
            <div className={styles.weekContent}>
              <p>업무 이해 및 환경 셋업부터 시작하는 초기 단계입니다.</p>
              <div className={styles.weekStats}>
                <div className={styles.statItem}>
                  <label>문서</label>
                  <span>7개</span>
                </div>
                <div className={styles.statItem}>
                  <label>체크리스트</label>
                  <span>9개</span>
                </div>
                <div className={styles.statItem}>
                  <label>완료</label>
                  <span>2개</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Day Summary Modal */}
      {isDaySummaryModalOpen && selectedDay && (
        <Modal
          open
          onClose={() => setIsDaySummaryModalOpen(false)}
          title="DAY {selectedDay.day} 요약"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDaySummaryModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('30day-plan-1')}
                onClick={() => run('30day-plan-1', '처리를 완료했습니다.', () => setIsDaySummaryModalOpen(false))}
              >
                세부 항목 보기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.dayCard}>
            <h3 className={styles.dayTitle}>{selectedDay.title}</h3>
            <div className={styles.dayMeta}>
              <span className={selectedDay.status === 'COMPLETED' ? styles.completed : styles.pending}>
                {selectedDay.status === 'COMPLETED' ? '완료' : '진행 중'}
              </span>
              <span className={styles.progressLabel}>{selectedDay.type}</span>
            </div>
            <div className={styles.dayBreakdown}>
              {selectedDay.description && <div className={styles.breakdownItem}>{selectedDay.description}</div>}
              {selectedDay.personName && <div className={styles.breakdownItem}>담당자: {selectedDay.personName}</div>}
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Plan Generation Modal */}
      {isPlanGenerationModalOpen && (
        <Modal
          open
          onClose={() => setIsPlanGenerationModalOpen(false)}
          title="계획 생성"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsPlanGenerationModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('30day-plan-2')}
                onClick={() => run('30day-plan-2', '처리를 완료했습니다.', () => setIsPlanGenerationModalOpen(false))}
              >
                생성 시작
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.generationCard}>
            <div className={styles.generationOption}>
              <input type="radio" name="gen" value="new" defaultChecked />
              <label>새로운 계획 생성</label>
            </div>
            <div className={styles.generationOption}>
              <input type="radio" name="gen" value="regen" />
              <label>현재 계획 기반 재생성</label>
            </div>
          </div>
          <div className={styles.generationNote}>
            <p>계획 생성 시 AI가 현재 진행도와 팀 특성을 고려하여 맞춤 계획을 작성합니다.</p>
          </div>
        </Modal>
      )}

      {/* 4. Completion Status Modal */}
      {isCompletionStatusModalOpen && (
        <Modal
          open
          onClose={() => setIsCompletionStatusModalOpen(false)}
          title="완료 현황"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsCompletionStatusModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.statusCard}>
            <div className={styles.statusItem}>
              <label>완료된 일정</label>
              <span className={styles.statusValue}>1개 (DAY 1)</span>
            </div>
            <div className={styles.statusItem}>
              <label>진행 중</label>
              <span className={styles.statusValue}>3개 (DAY 2, 3, ...)</span>
            </div>
            <div className={styles.statusItem}>
              <label>대기 중</label>
              <span className={styles.statusValue}>26개</span>
            </div>
            <div className={styles.statusItem}>
              <label>전체 진행률</label>
              <span className={styles.statusValue} style={{ color: '#6C46A2' }}>11%</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Plan Edit Modal */}
      {isPlanEditModalOpen && (
        <Modal
          open
          onClose={() => setIsPlanEditModalOpen(false)}
          title="계획 편집"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsPlanEditModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('30day-plan-3')}
                onClick={() => run('30day-plan-3', '변경 내용을 저장했습니다.', () => setIsPlanEditModalOpen(false))}
              >
                저장
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.editForm}>
            <div className={styles.formGroup}>
              <label>계획 이름</label>
              <input type="text" defaultValue="마케팅팀 인수인계 계획" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>설명</label>
              <textarea defaultValue="30일 신입 인수인계 계획" className={styles.textarea} rows={3} />
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Task Breakdown Modal */}
      {isTaskBreakdownModalOpen && selectedDay && (
        <Modal
          open
          onClose={() => setIsTaskBreakdownModalOpen(false)}
          title="DAY {selectedDay.day} 항목"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTaskBreakdownModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.taskList}>
            {selectedDay.title && (
              <div className={styles.taskGroup}>
                <h4>{selectedDay.title}</h4>
                <div className={styles.taskItems}>
                  {selectedDay.description && <div className={styles.taskItem}>{selectedDay.description}</div>}
                  {selectedDay.personName && <div className={styles.taskItem}>담당자: {selectedDay.personName}</div>}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 7. Plan Action Modal */}
      {isPlanActionModalOpen && (
        <Modal
          open
          onClose={() => setIsPlanActionModalOpen(false)}
          title="계획 작업"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsPlanActionModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.actionList}>
            <button className={styles.actionItem}>새 계획 생성</button>
            <button className={styles.actionItem}>현재 계획 재생성</button>
            <button className={styles.actionItem}>계획 편집</button>
            <button className={styles.actionItem}>완료 상태 업데이트</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
