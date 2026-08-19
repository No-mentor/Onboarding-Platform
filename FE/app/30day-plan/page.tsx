'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Zap, Bell, HelpCircle, Check, ChevronDown } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import { getOnboardingPlan, generateOnboardingPlan, updatePlanItemStatus, PlanResponse, PlanItemResponse } from '@/lib/api';
import styles from './30day-plan.module.css';

const MOCK_PLAN_TITLES = [
  '업무 이해 및 환경 설정', '핵심 업무 프로세스 학습', '주요 프로젝트 및 자료 파악', '브랜드 가이드 이해', '주간회의 참여',
  '거래처 커뮤니케이션 파악', '첫 주 피드백', '예산안 작성 규칙 학습', '캠페인 성과 지표 이해', '콘텐츠 검수 절차 실습',
  '광고 계정 구조 파악', '월간 보고서 작성 연습', '담당 업무 섀도잉', '2주차 회고', '소규모 업무 단독 수행',
  '협업 부서 업무 이해', '마케팅 도구 활용', '데이터 정리 실습', '캠페인 일정 작성', '중간 피드백 반영',
  '업무 문서 최신화', '이슈 대응 절차 학습', '성과 보고 초안 작성', '담당자 검토 요청', '개선 사항 반영',
  '최종 업무 점검', '인수인계 누락 확인', '향후 목표 작성', '최종 피드백', '인수인계 완료 및 향후 계획',
];

const DEFAULT_MOCK_DAYS = MOCK_PLAN_TITLES.map((title, index) => ({
  id: `mock-plan-day-${index + 1}`,
  dayIndex: index + 1,
  title,
  status: index === 0 ? 'COMPLETED' : index < 12 ? 'IN_PROGRESS' : 'NOT_STARTED',
  type: index % 3 === 0 ? 'DOCUMENT' : index % 3 === 1 ? 'CHECKLIST' : 'PRACTICE',
  description: index % 3 === 0 ? '[온보딩 참고자료] 필수 문서 확인 및 체크리스트 점검' : '체크리스트 점검 및 업무 실습 진행',
  personName: index < 14 ? '이민수 멘토' : '김세원',
  progress: index === 0 ? 100 : index === 1 ? 50 : index === 2 ? 30 : index < 7 ? 65 : index < 12 ? 40 : 0,
  documentCount: (index % 3) + 1,
  checklistCount: (index % 2) + 2,
  practiceCount: index % 4 === 2 ? 1 : 0,
  meetingCount: index === 0 ? 1 : 0,
}));

export default function ThirtyDayPlanPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedTab, setSelectedTab] = useState('all');
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [planData, setPlanData] = useState<PlanResponse | null>(null);
  const [days, setDays] = useState(DEFAULT_MOCK_DAYS);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal states
  const [isWeekDetailsModalOpen, setIsWeekDetailsModalOpen] = useState(false);
  const [isDaySummaryModalOpen, setIsDaySummaryModalOpen] = useState(false);
  const [isPlanGenerationModalOpen, setIsPlanGenerationModalOpen] = useState(false);
  const [isCompletionStatusModalOpen, setIsCompletionStatusModalOpen] = useState(false);
  const [isPlanActionModalOpen, setIsPlanActionModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<typeof DEFAULT_MOCK_DAYS[0] | null>(null);

  const fetchPlan = async () => {
    try {
      setIsLoading(true);
      const plan = await getOnboardingPlan(true);
      setPlanData(plan);
      if (plan && plan.items && plan.items.length > 0) {
        const mapped = plan.items.map((item: PlanItemResponse, idx: number) => ({
          id: item.id || `plan-item-${idx + 1}`,
          dayIndex: item.day || idx + 1,
          title: item.title,
          status: item.status || 'NOT_STARTED',
          type: item.type || 'DOCUMENT',
          description: item.description || '세부 과제 및 지침 사항',
          personName: item.personName || '담당 멘토',
          progress: item.status === 'COMPLETED' ? 100 : item.status === 'IN_PROGRESS' ? 50 : 0,
          documentCount: 1,
          checklistCount: 2,
          practiceCount: 1,
          meetingCount: 0,
        }));
        setDays(mapped);
      }
    } catch (err) {
      console.log('실제 플랜 조회 실패 (모의 데이터로 유지):', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleGeneratePlan = async () => {
    try {
      setIsGenerating(true);
      await generateOnboardingPlan();
      showToast('AI 맞춤 30일 인수인계 계획이 성공적으로 생성되었습니다.', 'success');
      setIsPlanGenerationModalOpen(false);
      setIsPlanActionModalOpen(false);
      await fetchPlan();
    } catch (err: any) {
      showToast(err?.message || '계획 생성에 실패했습니다.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleDayComplete = async (item: typeof DEFAULT_MOCK_DAYS[0], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = item.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';

    // Optimistic update
    setDays((prev) =>
      prev.map((d) =>
        d.id === item.id
          ? {
              ...d,
              status: nextStatus,
              progress: nextStatus === 'COMPLETED' ? 100 : 50,
            }
          : d
      )
    );

    if (!item.id.startsWith('mock-')) {
      try {
        await updatePlanItemStatus(item.id, nextStatus);
        showToast(`${item.dayIndex}일차 과제가 ${nextStatus === 'COMPLETED' ? '완료' : '진행 중'} 상태로 변경되었습니다.`, 'success');
      } catch (err) {
        showToast('상태 업데이트 실패', 'error');
        fetchPlan();
      }
    } else {
      showToast(`${item.dayIndex}일차 과제 상태가 변경되었습니다.`, 'info');
    }
  };

  const visibleDays = selectedTab === 'all'
    ? days
    : days.filter((day) => {
        const week = Number(selectedTab[0]);
        return day.dayIndex >= (week - 1) * 7 + 1 && day.dayIndex <= (week === 4 ? 30 : week * 7);
      });

  const toggleDayExpanded = (day: number) => {
    setExpandedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Dynamic metrics
  const completedCount = days.filter((d) => d.status === 'COMPLETED').length;
  const inProgressCount = days.filter((d) => d.status === 'IN_PROGRESS').length;
  const pendingCount = days.filter((d) => d.status !== 'COMPLETED' && d.status !== 'IN_PROGRESS').length;
  const totalCount = days.length || 30;
  const overallPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className={styles.container}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>30일 인수인계 계획</h1>
            <p className={styles.description}>AI가 생성한 계획을 일자별로 확인하고 항목 상태를 관리하세요.</p>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.workspaceBtn}
              onClick={() => router.push('/workspace-selection')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>마케팅팀 인수인계</span>
              <ChevronDown size={14} />
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')} title="알림 센터">
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')} title="AI 어시스턴트 질문">
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
                  {tab === 'all' ? `전체 (${days.length}일)` : tab === '1week' ? '1주차' : tab === '2week' ? '2주차' : tab === '3week' ? '3주차' : '4주차'}
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
            {visibleDays.map((item, idx) => {
              const isExpanded = expandedDays.includes(item.dayIndex);
              return (
                <div key={item.id} className={styles.timelineItem}>
                  <div className={styles.timelineMarker}>
                    <div
                      className={`${styles.dot} ${item.status === 'COMPLETED' ? styles.completed : item.status === 'IN_PROGRESS' ? styles.inProgress : ''}`}
                      onClick={(e) => handleToggleDayComplete(item, e)}
                      style={{ cursor: 'pointer' }}
                      title="클릭하여 완료 토글"
                    >
                      {item.status === 'COMPLETED' && <Check size={14} className={styles.checkmark} />}
                    </div>
                    {idx < visibleDays.length - 1 && <div className={styles.line} />}
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
                      <span className={styles.dayLabel}>{item.dayIndex}일차</span>
                      <div className={styles.daySummary}>
                        <h3 className={styles.dayTitle}>{item.title}</h3>
                        <div className={styles.dayTags}>
                          <span>문서 {item.documentCount}</span>
                          <span>체크리스트 {item.checklistCount}</span>
                          {item.practiceCount > 0 && <span>실습 {item.practiceCount}</span>}
                          {item.meetingCount > 0 && <span>미팅 {item.meetingCount}</span>}
                        </div>
                      </div>
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
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          border: 'none',
                          backgroundColor: item.status === 'COMPLETED' ? '#dcfce7' : item.status === 'IN_PROGRESS' ? '#fef3c7' : '#f1f5f9',
                          color: item.status === 'COMPLETED' ? '#166534' : item.status === 'IN_PROGRESS' ? '#92400e' : '#475569',
                          marginRight: '8px'
                        }}
                      >
                        {item.status === 'COMPLETED' ? '완료됨' : item.status === 'IN_PROGRESS' ? '진행 중' : '대기'}
                      </button>
                      <button
                        className={styles.expandBtn}
                        onClick={() => toggleDayExpanded(item.dayIndex)}
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease'
                        }}
                      >
                        <ChevronDown size={18} />
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
              <span className={styles.footerCheck}><Check size={15} /></span>
              <span>전체 30일 진행률: <strong>{overallPercent}%</strong> ({completedCount}/{totalCount} 완료)</span>
            </div>
            <button className={styles.generateBtn} onClick={() => setIsPlanActionModalOpen(true)}>
              <Zap size={16} /> 계획 생성 / 다시 생성
            </button>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. Week Details Modal */}
      {isWeekDetailsModalOpen && (
        <Modal
          open
          onClose={() => setIsWeekDetailsModalOpen(false)}
          title="주차별 상세 로드맵"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsWeekDetailsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.weekCard}>
            <div className={styles.weekHeader}>
              <span className={styles.weekLabel}>전체 진행 상황</span>
              <span className={styles.weekProgress}>{overallPercent}% 완료</span>
            </div>
            <div className={styles.weekContent}>
              <p>사내 온보딩 문서와 인수인계 규정을 기반으로 AI가 자동 구성한 맞춤형 로드맵입니다.</p>
              <div className={styles.weekStats}>
                <div className={styles.statItem}>
                  <label>전체 과제</label>
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
          title={`${selectedDay.dayIndex}일차 요약`}
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDaySummaryModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  handleToggleDayComplete(selectedDay);
                  setIsDaySummaryModalOpen(false);
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
              <span className={selectedDay.status === 'COMPLETED' ? styles.statusCompleted : styles.pending}>
                {selectedDay.status === 'COMPLETED' ? '완료' : '진행 중'}
              </span>
              <span className={styles.progressLabel}>{getDisplayLabel(selectedDay.type)}</span>
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
                onClick={handleGeneratePlan}
              >
                생성 시작
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.generationCard}>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
              사내 지식 베이스(문서)와 역할 정의를 기반으로 AI가 30일 맞춤형 인수인계 로드맵을 자동으로 생성합니다.
            </p>
          </div>
          <div className={styles.generationNote}>
            <p>💡 생성 시 기존에 완료된 항목을 보존하며 최신 사내 가이드라인이 반영됩니다.</p>
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
              <span className={styles.statusValue}>{completedCount}개</span>
            </div>
            <div className={styles.statusItem}>
              <label>진행 중</label>
              <span className={styles.statusValue}>{inProgressCount}개</span>
            </div>
            <div className={styles.statusItem}>
              <label>대기 중</label>
              <span className={styles.statusValue}>{pendingCount}개</span>
            </div>
            <div className={styles.statusItem}>
              <label>전체 진행률</label>
              <span className={styles.statusValue} style={{ color: '#0765FC' }}>{overallPercent}%</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Plan Action Modal */}
      {isPlanActionModalOpen && (
        <Modal
          open
          onClose={() => setIsPlanActionModalOpen(false)}
          title="30일 로드맵 빠른 작업"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsPlanActionModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.actionList}>
            <button className={styles.actionItem} onClick={handleGeneratePlan} disabled={isGenerating}>
              ⚡ {isGenerating ? 'AI가 계획을 생성하는 중...' : 'AI 맞춤 계획 재생성'}
            </button>
            <button className={styles.actionItem} onClick={() => { setIsPlanActionModalOpen(false); router.push('/checklist'); }}>
              📋 체크리스트 바로가기
            </button>
            <button className={styles.actionItem} onClick={() => { setIsPlanActionModalOpen(false); router.push('/daily-tasks'); }}>
              📅 오늘 할 일 확인하기
            </button>
            <button className={styles.actionItem} onClick={() => { setIsPlanActionModalOpen(false); router.push('/ai-chat'); }}>
              🤖 AI에게 질문하기
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}