'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Zap, Bell, HelpCircle, Check, RotateCcw, CheckCircle2, Clock } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import { getOnboardingPlan, generateOnboardingPlan, updatePlanItemStatus } from '@/lib/api';
import styles from './30day-plan.module.css';

export default function ThirtyDayPlanPage() {
  const router = useRouter();
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [selectedTab, setSelectedTab] = useState('all');
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

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
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      setIsLoading(true);
      let response = await getOnboardingPlan(true);

      // 계획이 없으면 생성
      if (!response || !response.items || response.items.length === 0) {
        response = await generateOnboardingPlan();
      }

      const items = response.items || [];
      setDays(items);
    } catch (err: any) {
      console.error('계획 로드 실패:', err);
      try {
        const generatedResponse = await generateOnboardingPlan();
        const items = generatedResponse.items || [];
        setDays(items);
      } catch (generateErr) {
        console.error('계획 생성 실패:', generateErr);
        showToast('온보딩 계획을 불러올 수 없습니다.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDayComplete = async (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = item.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      if (item.id) {
        await updatePlanItemStatus(item.id, nextStatus);
      }
      setDays((prev) =>
        prev.map((d) => (d.id === item.id || d.day === item.day ? { ...d, status: nextStatus } : d))
      );
      if (selectedDay && (selectedDay.id === item.id || selectedDay.day === item.day)) {
        setSelectedDay((prev: any) => ({ ...prev, status: nextStatus }));
      }
      showToast(nextStatus === 'COMPLETED' ? `DAY ${item.day} 일정을 완료했습니다! 🎉` : `DAY ${item.day} 일정을 진행 중으로 변경했습니다.`, 'success');
    } catch (err: any) {
      showToast(err.message || '상태 변경 실패', 'error');
    }
  };

  const handleGenerateNewPlan = async () => {
    try {
      setIsGenerating(true);
      const res = await generateOnboardingPlan();
      setDays(res.items || []);
      showToast('30일 온보딩 로드맵이 생성되었습니다!', 'success');
      setIsPlanGenerationModalOpen(false);
      setIsPlanActionModalOpen(false);
    } catch (err: any) {
      showToast(err.message || '계획 생성 실패', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleDayExpanded = (day: number) => {
    setExpandedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const filteredDays = days.filter((item) => {
    const day = item.day ?? item.dayIndex ?? 1;
    if (selectedTab === 'all') return true;
    if (selectedTab === '1week') return day >= 1 && day <= 7;
    if (selectedTab === '2week') return day >= 8 && day <= 14;
    if (selectedTab === '3week') return day >= 15 && day <= 21;
    if (selectedTab === '4week') return day >= 22 && day <= 30;
    return true;
  });

  const totalCount = days.length;
  const completedCount = days.filter((d) => d.status === 'COMPLETED').length;
  const inProgressCount = days.filter((d) => d.status === 'IN_PROGRESS').length;
  const pendingCount = totalCount - completedCount - inProgressCount;
  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
              <button className={styles.refreshBtn} onClick={() => setIsPlanGenerationModalOpen(true)}>
                <RotateCcw size={14} /> 계획 재생성
              </button>
              <button className={styles.createBtn} onClick={() => setIsPlanGenerationModalOpen(true)}>
                <Plus size={16} /> 계획 생성
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.timeline}>
            {filteredDays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                <p>생성된 온보딩 계획이 없습니다.</p>
                <button
                  onClick={handleGenerateNewPlan}
                  disabled={isGenerating}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    backgroundColor: '#4F46E5',
                    color: '#fff',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {isGenerating ? '계획 생성 중...' : '30일 온보딩 계획 생성하기'}
                </button>
              </div>
            ) : (
              filteredDays.map((item, idx) => {
                const currentDay = item.day ?? item.dayIndex ?? idx + 1;
                const isExpanded = expandedDays.includes(currentDay);
                const isCompleted = item.status === 'COMPLETED';
                const isInProgress = item.status === 'IN_PROGRESS';

                return (
                  <div key={item.id || idx} className={styles.timelineItem}>
                    <div className={styles.timelineMarker}>
                      <button
                        className={`${styles.dot} ${isCompleted ? styles.completed : ''}`}
                        onClick={(e) => handleToggleDayComplete(item, e)}
                        title={isCompleted ? '완료 취소' : '완료로 변경'}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {isCompleted && <Check size={14} className={styles.checkmark} />}
                      </button>
                      {idx < filteredDays.length - 1 && <div className={styles.line} />}
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
                        <span className={styles.dayLabel}>DAY {currentDay}</span>
                        <h3 className={styles.dayTitle}>{item.title}</h3>
                      </div>

                      {isExpanded && (
                        <div className={styles.dayItems}>
                          {item.description && <span>{item.description}</span>}
                          {item.personName && <span>담당자: {item.personName}</span>}
                        </div>
                      )}

                      <div className={styles.progressArea}>
                        <button
                          onClick={(e) => handleToggleDayComplete(item, e)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: isCompleted ? '#DCFCE7' : isInProgress ? '#FEF3C7' : '#F3F4F6',
                            color: isCompleted ? '#166534' : isInProgress ? '#92400E' : '#4B5563',
                          }}
                          title="클릭하여 상태 변경"
                        >
                          {isCompleted ? '완료' : isInProgress ? '진행 중' : '시작 전'}
                        </button>
                        <button
                          className={styles.expandBtn}
                          onClick={() => toggleDayExpanded(currentDay)}
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
              })
            )}
          </div>

          {/* Footer Info */}
          <div className={styles.footerInfo}>
            <div className={styles.infoItem}>
              <span>전체 30일 진행률: <strong>{overallPercent}%</strong> ({completedCount}/{totalCount} 완료)</span>
            </div>
            <div className={styles.infoItem}>
              <button
                onClick={() => setIsCompletionStatusModalOpen(true)}
                style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', fontWeight: 600 }}
              >
                진행 현황 자세히 보기 →
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button className={styles.generateBtn} onClick={() => setIsPlanGenerationModalOpen(true)}>
            <Zap size={16} /> 계획 재생성 (AI Generate)
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
            </>
          }
        >
          <div className={styles.weekCard}>
            <div className={styles.weekHeader}>
              <span className={styles.weekLabel}>전체 30일 로드맵 현황</span>
              <span className={styles.weekProgress}>{overallPercent}% 완료</span>
            </div>
            <div className={styles.weekContent}>
              <p>사내 온보딩 문서와 업무 규정을 기반으로 AI가 자동 구성한 맞춤형 로드맵입니다.</p>
              <div className={styles.weekStats}>
                <div className={styles.statItem}>
                  <label>전체 일정</label>
                  <span>{totalCount}개</span>
                </div>
                <div className={styles.statItem}>
                  <label>완료</label>
                  <span style={{ color: '#10B981' }}>{completedCount}개</span>
                </div>
                <div className={styles.statItem}>
                  <label>진행 중</label>
                  <span style={{ color: '#F59E0B' }}>{inProgressCount}개</span>
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
          title={`DAY ${selectedDay.day ?? ''} 요약`}
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDaySummaryModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  handleToggleDayComplete(selectedDay);
                }}
              >
                {selectedDay.status === 'COMPLETED' ? '진행 중으로 변경' : '완료로 표시하기'}
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.dayCard}>
            <h3 className={styles.dayTitle}>{selectedDay.title}</h3>
            <div className={styles.dayMeta}>
              <span className={selectedDay.status === 'COMPLETED' ? styles.completed : styles.pending}>
                {selectedDay.status === 'COMPLETED' ? '완료' : selectedDay.status === 'IN_PROGRESS' ? '진행 중' : '대기 중'}
              </span>
              <span className={styles.progressLabel}>{selectedDay.type || 'ONBOARDING'}</span>
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
          title="30일 온보딩 계획 생성 / 재생성"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsPlanGenerationModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isGenerating}
                onClick={handleGenerateNewPlan}
              >
                생성 시작
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.generationCard}>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: 0 }}>
              사내 지식 베이스(문서)와 역할 정의를 기반으로 AI가 30일 맞춤형 인수인계 로드맵을 자동으로 생성합니다.
            </p>
          </div>
          <div className={styles.generationNote} style={{ marginTop: '12px' }}>
            <p>💡 생성 시 기존에 완료된 항목을 보존하며 최신 사내 가이드라인이 반영됩니다.</p>
          </div>
        </Modal>
      )}

      {/* 4. Completion Status Modal */}
      {isCompletionStatusModalOpen && (
        <Modal
          open
          onClose={() => setIsCompletionStatusModalOpen(false)}
          title="30일 온보딩 완료 현황"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsCompletionStatusModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.statusCard}>
            <div className={styles.statusItem}>
              <label>완료된 일정</label>
              <span className={styles.statusValue} style={{ color: '#10B981' }}>{completedCount}개</span>
            </div>
            <div className={styles.statusItem}>
              <label>진행 중</label>
              <span className={styles.statusValue} style={{ color: '#F59E0B' }}>{inProgressCount}개</span>
            </div>
            <div className={styles.statusItem}>
              <label>대기 중</label>
              <span className={styles.statusValue}>{pendingCount}개</span>
            </div>
            <div className={styles.statusItem}>
              <label>전체 진행률</label>
              <span className={styles.statusValue} style={{ color: '#4F46E5', fontWeight: 700 }}>{overallPercent}%</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
