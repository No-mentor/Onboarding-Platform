'use client';

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Zap, HelpCircle, Check, ChevronDown } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useMe } from '@/components/require-workspace';
import { getDisplayLabel } from '@/lib/display-labels';
import { selectableTemplates } from '@/lib/templates';
import {
  generateOnboardingPlan,
  getOnboardingPlan,
  getTemplates,
  regenerateOnboardingPlan,
  updatePlanItemStatus,
  type PlanItemResponse,
  type PlanItemStatus,
  type PlanResponse,
  type TemplateResponse,
} from '@/lib/api';
import styles from './30day-plan.module.css';

/** 하루치 묶음. 서버는 항목 단위로 주므로 dayIndex 로 모아서 보여 준다 */
interface PlanDay {
  dayIndex: number;
  items: PlanItemResponse[];
  title: string;
  documentCount: number;
  checklistCount: number;
  practiceCount: number;
  personCount: number;
  doneCount: number;
  /** 그날 항목이 모두 끝났으면 DONE, 일부만 끝났으면 IN_PROGRESS, 아니면 PENDING */
  status: 'DONE' | 'IN_PROGRESS' | 'PENDING';
  progress: number;
}

function groupByDay(items: PlanItemResponse[]): PlanDay[] {
  const byDay = new Map<number, PlanItemResponse[]>();
  for (const item of items) {
    const list = byDay.get(item.dayIndex);
    if (list) list.push(item);
    else byDay.set(item.dayIndex, [item]);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayIndex, dayItems]) => {
      const doneCount = dayItems.filter(i => i.status === 'DONE').length;
      const progress = dayItems.length === 0 ? 0 : Math.round((doneCount / dayItems.length) * 100);
      return {
        dayIndex,
        items: dayItems,
        title:
          dayItems.length === 1
            ? dayItems[0].title
            : `${dayItems[0].title} 외 ${dayItems.length - 1}건`,
        documentCount: dayItems.filter(i => i.type === 'DOCUMENT').length,
        checklistCount: dayItems.filter(i => i.type === 'CHECKLIST').length,
        practiceCount: dayItems.filter(i => i.type === 'PRACTICE').length,
        personCount: dayItems.filter(i => i.type === 'PERSON').length,
        doneCount,
        status: doneCount === dayItems.length ? 'DONE' : doneCount > 0 ? 'IN_PROGRESS' : 'PENDING',
        progress,
      };
    });
}

/** 관리자만 계획 재생성을 할 수 있다 (서버 권한과 맞춘다) */
const ADMIN_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER']);

/** 서버 PlanResponse.generatedBy 를 화면 문구로 */
const GENERATED_BY_LABEL: Record<string, string> = {
  TEMPLATE: '템플릿 기반',
  AI: 'AI 생성',
  FALLBACK: '기본 골격',
};

/** sourceTemplateId 로 템플릿 이름을 찾는다. 목록을 아직 못 받았으면 빈 문자열 */
function templateNameOf(templateId: string, templates: TemplateResponse[]): string {
  return templates.find(t => t.id === templateId)?.name ?? '';
}


export default function ThirtyDayPlanPage() {
  const router = useRouter();
  const me = useMe();
  const { showToast } = useToast();

  const [selectedTab, setSelectedTab] = useState('all');
  const [expandedDays, setExpandedDays] = useState<number[]>([]);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const [isDaySummaryModalOpen, setIsDaySummaryModalOpen] = useState(false);
  const [isPlanGenerationModalOpen, setIsPlanGenerationModalOpen] = useState(false);
  const [isCompletionStatusModalOpen, setIsCompletionStatusModalOpen] = useState(false);
  const [isPlanActionModalOpen, setIsPlanActionModalOpen] = useState(false);
  const [isWeekDetailsModalOpen, setIsWeekDetailsModalOpen] = useState(false);
  const [isTaskBreakdownModalOpen, setIsTaskBreakdownModalOpen] = useState(false);
  /** 생성 모달의 선택지: 새로 만들기 / 완료 항목을 지키며 다시 만들기 */
  const [generationMode, setGenerationMode] = useState<'new' | 'keep'>('keep');
  // 서버는 templateId 를 받지만 화면에서 고를 방법이 없었다. 직접 선택할 수 있게 한다
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const canRegenerate = ADMIN_ROLES.has(me?.currentWorkspace?.role ?? '');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getOnboardingPlan(true);
      setPlan(response);
    } catch (err) {
      // 계획이 아직 없으면 서버가 404 를 준다. 목록을 비우고 생성 안내를 보여 준다.
      setPlan(null);
      setError(err instanceof Error ? err.message : '계획을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 템플릿 목록. 생성 모달의 선택지와, 계획의 sourceTemplateId 이름 표시에 쓴다.
   * 목록 조회는 OWNER/ADMIN/MANAGER 만 가능하므로 그 권한일 때만 부른다 (신입은 403).
   */
  const loadTemplates = useCallback(async (): Promise<TemplateResponse[]> => {
    if (!canRegenerate) return [];
    try {
      const response = await getTemplates();
      const items = response.items ?? [];
      setTemplates(items);
      return items;
    } catch {
      // 템플릿을 못 불러와도 계획 조회·생성 자체는 가능하다 (서버가 자동으로 고른다)
      setTemplates([]);
      return [];
    }
  }, [canRegenerate]);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    void loadTemplates();
  }, [load, loadTemplates]);

  const days = useMemo(() => groupByDay(plan?.items ?? []), [plan]);
  const selectedDay = useMemo(
    () => days.find(d => d.dayIndex === selectedDayIndex) ?? null,
    [days, selectedDayIndex]
  );

  const visibleDays = useMemo(() => {
    if (selectedTab === 'all') return days;
    const week = Number(selectedTab[0]);
    const from = (week - 1) * 7 + 1;
    // 4주차는 남는 이틀까지 함께 보여 준다
    const to = week === 4 ? Number.MAX_SAFE_INTEGER : week * 7;
    return days.filter(day => day.dayIndex >= from && day.dayIndex <= to);
  }, [days, selectedTab]);

  /** 탭에서 고른 주차(전체면 1주차)의 실제 집계 */
  const weekStats = useMemo(() => {
    const week = selectedTab === 'all' ? 1 : Number(selectedTab[0]);
    const from = (week - 1) * 7 + 1;
    const to = week === 4 ? Number.MAX_SAFE_INTEGER : week * 7;
    const weekDays = days.filter(d => d.dayIndex >= from && d.dayIndex <= to);
    const items = weekDays.flatMap(d => d.items);
    const done = items.filter(i => i.status === 'DONE').length;
    return {
      week,
      label: week === 4 ? `4주차 (${from}일차 이후)` : `${week}주차 (${from}~${to}일차)`,
      dayCount: weekDays.length,
      total: items.length,
      done,
      documentCount: items.filter(i => i.type === 'DOCUMENT').length,
      checklistCount: items.filter(i => i.type === 'CHECKLIST').length,
      percent: items.length === 0 ? 0 : Math.round((done / items.length) * 100),
    };
  }, [days, selectedTab]);

  const allItems = plan?.items ?? [];
  const completedCount = allItems.filter(i => i.status === 'DONE').length;
  const skippedCount = allItems.filter(i => i.status === 'SKIPPED').length;
  const pendingCount = allItems.filter(i => i.status === 'PENDING').length;
  const totalCount = allItems.length;
  const overallPercent = Math.round(Number(plan?.progressPercent ?? 0));

  // 서버가 거부하는 조합을 고를 수 없게, 쓸 수 있는 템플릿만 드롭다운에 넣는다
  const usableTemplates = useMemo(
    () => selectableTemplates(templates, me?.currentWorkspace?.role),
    [templates, me?.currentWorkspace?.role]
  );


  /**
   * 생성/재생성 모달을 연다.
   *
   * 모달 state(selectedTemplateId/generationMode)는 이전에 열렸을 때 값이 아니라
   * 매번 여기서 명확하게 다시 정한다 — 그러지 않으면 고른 템플릿을 삭제한 뒤 모달을
   * 다시 열어도 이제는 존재하지 않는 templateId 가 그대로 남아 전송될 수 있다.
   *
   * 정책: 현재 계획에 연결된 템플릿(sourceTemplateId)이 아직도 고를 수 있는 상태면
   * 그것을 기본 선택으로 보여준다(재생성 시 서버 기본 동작 "기존 템플릿 재사용"과 화면이
   * 일치하도록). 아니라면(계획이 없거나, 템플릿이 삭제/역할 불일치 등으로 더 이상 못 고르면)
   * "자동 선택"(빈 값)으로 시작한다.
   */
  const openGenerationModal = async () => {
    setGenerationMode('keep');
    setIsPlanGenerationModalOpen(true);
    const fresh = await loadTemplates();
    const selectable = selectableTemplates(fresh, me?.currentWorkspace?.role);
    const sourceTemplateId = plan?.sourceTemplateId;
    setSelectedTemplateId(
      sourceTemplateId && selectable.some(t => t.id === sourceTemplateId) ? sourceTemplateId : ''
    );
  };

  /**
   * 방어선: 선택된 템플릿이 목록에서 사라지면(삭제 등) 존재하지 않는 id 로 취급한다.
   * state 를 별도 effect 로 지우는 대신 렌더링 시점에 걸러서 쓴다 — 그러면 목록이 아직
   * 늦게 도착한 순간에도(비동기 로딩 중) 화면과 실제로 전송될 값이 항상 일치한다.
   */
  const effectiveTemplateId = usableTemplates.some(t => t.id === selectedTemplateId)
    ? selectedTemplateId
    : '';

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      const templateId = effectiveTemplateId || undefined;

      if (plan?.planId) {
        // 재생성은 templateId 와 preserveCompleted 를 함께 받는다.
        // templateId 를 비우면 서버가 기존 계획의 템플릿을 재사용한다.
        const result = await regenerateOnboardingPlan(plan.planId, {
          templateId,
          preserveCompleted: generationMode === 'keep',
        });
        showToast(
          generationMode === 'keep'
            ? `완료 항목을 유지하고 다시 만들었습니다. (v${result.version})`
            : `계획을 새로 만들었습니다. (v${result.version})`,
          'success'
        );
      } else {
        await generateOnboardingPlan({ templateId });
        showToast('30일 인수인계 계획을 생성했습니다.', 'success');
      }
      setIsPlanGenerationModalOpen(false);
      setIsPlanActionModalOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '계획 생성에 실패했습니다.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /** 항목 하나의 상태를 바꾼다 */
  const handleToggleItem = async (item: PlanItemResponse) => {
    const nextStatus: PlanItemStatus = item.status === 'DONE' ? 'PENDING' : 'DONE';
    setUpdatingItemId(item.id);
    try {
      await updatePlanItemStatus(item.id, nextStatus);
      // 진행률은 서버가 계산하므로 계획을 다시 받아 온다
      await load();
      showToast(nextStatus === 'DONE' ? '완료로 표시했습니다.' : '진행 중으로 되돌렸습니다.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '상태 변경에 실패했습니다.', 'error');
    } finally {
      setUpdatingItemId(null);
    }
  };

  /** 하루치를 한 번에 완료 처리한다 (이미 다 끝났으면 되돌린다) */
  const handleToggleDay = async (day: PlanDay, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    const nextStatus: PlanItemStatus = day.status === 'DONE' ? 'PENDING' : 'DONE';
    const targets = day.items.filter(item => item.status !== nextStatus);
    if (targets.length === 0) return;

    setUpdatingItemId(`day-${day.dayIndex}`);
    try {
      for (const item of targets) {
        await updatePlanItemStatus(item.id, nextStatus);
      }
      await load();
      showToast(
        `${day.dayIndex}일차를 ${nextStatus === 'DONE' ? '완료' : '진행 중'} 상태로 바꿨습니다.`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : '상태 변경에 실패했습니다.', 'error');
      await load();
    } finally {
      setUpdatingItemId(null);
    }
  };

  const toggleDayExpanded = (day: number) => {
    setExpandedDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

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
              <span>{me?.currentWorkspace?.name ?? '업무 공간'}</span>
              <ChevronDown size={14} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')} title="AI 어시스턴트 질문">
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        <div className={styles.contentArea}>
          {error && (
            <div className={styles.errorBanner}>
              <span>{error}</span>
              <button type="button" onClick={() => void load()}>다시 시도</button>
            </div>
          )}

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
              {canRegenerate && (
                <button className={styles.refreshBtn} onClick={() => void openGenerationModal()}>
                  계획 재생성
                </button>
              )}
              <button className={styles.createBtn} onClick={() => void openGenerationModal()}>
                <Plus size={16} /> 계획 생성
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.timeline}>
            {isLoading ? (
              <div className={styles.placeholder}>불러오는 중...</div>
            ) : visibleDays.length === 0 ? (
              <div className={styles.placeholder}>
                {days.length === 0
                  ? '아직 30일 계획이 없습니다. 아래 계획 생성을 눌러 만들어 주세요.'
                  : '이 주차에 해당하는 항목이 없습니다.'}
              </div>
            ) : (
              visibleDays.map((day, idx) => {
                const isExpanded = expandedDays.includes(day.dayIndex);
                const isDayUpdating = updatingItemId === `day-${day.dayIndex}`;
                return (
                  <div key={day.dayIndex} className={styles.timelineItem}>
                    <div className={styles.timelineMarker}>
                      <div
                        className={`${styles.dot} ${day.status === 'DONE' ? styles.completed : day.status === 'IN_PROGRESS' ? styles.inProgress : ''}`}
                        onClick={(e) => void handleToggleDay(day, e)}
                        style={{ cursor: 'pointer' }}
                        title="클릭하여 하루치 완료 토글"
                      >
                        {day.status === 'DONE' && <Check size={14} className={styles.checkmark} />}
                      </div>
                      {idx < visibleDays.length - 1 && <div className={styles.line} />}
                    </div>

                    <div className={styles.content}>
                      <div
                        className={styles.contentHeader}
                        onClick={() => {
                          setSelectedDayIndex(day.dayIndex);
                          setIsDaySummaryModalOpen(true);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className={styles.dayLabel}>{day.dayIndex}일차</span>
                        <div className={styles.daySummary}>
                          <h3 className={styles.dayTitle}>{day.title}</h3>
                          <div className={styles.dayTags}>
                            {day.documentCount > 0 && <span>문서 {day.documentCount}</span>}
                            {day.checklistCount > 0 && <span>체크리스트 {day.checklistCount}</span>}
                            {day.practiceCount > 0 && <span>실습 {day.practiceCount}</span>}
                            {day.personCount > 0 && <span>사람 {day.personCount}</span>}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={styles.dayItems}>
                          {day.items.map((item) => (
                            <div key={item.id} className={styles.itemRow}>
                              <span className={styles.itemMeta}>
                                <span>
                                  {getDisplayLabel(item.type)} · {item.title}
                                  {item.estimatedMinutes != null && ` · 약 ${item.estimatedMinutes}분`}
                                </span>
                                {item.description && <span>{item.description}</span>}
                                {item.personName && <span>담당자: {item.personName}</span>}
                                {item.documentId && (
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/document-detail?id=${item.documentId}`)}
                                    style={{
                                      alignSelf: 'flex-start', border: 'none', background: 'none',
                                      padding: 0, color: '#0765FC', fontSize: '12.5px',
                                      textDecoration: 'underline', cursor: 'pointer',
                                    }}
                                  >
                                    연결 문서 열기
                                  </button>
                                )}
                              </span>
                              <button
                                className={styles.itemToggle}
                                onClick={() => void handleToggleItem(item)}
                                disabled={updatingItemId !== null}
                              >
                                {updatingItemId === item.id
                                  ? '처리 중...'
                                  : item.status === 'DONE'
                                    ? '완료 취소'
                                    : '완료'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={styles.progressArea}>
                        <span className={styles.progressPercent}>{day.progress}%</span>
                        <button
                          onClick={(e) => void handleToggleDay(day, e)}
                          disabled={updatingItemId !== null}
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: day.status === 'DONE' ? '#dcfce7' : day.status === 'IN_PROGRESS' ? '#fef3c7' : '#f1f5f9',
                            color: day.status === 'DONE' ? '#166534' : day.status === 'IN_PROGRESS' ? '#92400e' : '#475569',
                            marginRight: '8px'
                          }}
                        >
                          {isDayUpdating
                            ? '처리 중...'
                            : day.status === 'DONE'
                              ? '완료됨'
                              : `${day.doneCount}/${day.items.length} 진행`}
                        </button>
                        <button
                          className={styles.expandBtn}
                          onClick={() => toggleDayExpanded(day.dayIndex)}
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
              })
            )}
          </div>

          {/* Footer Info */}
          <div className={styles.footerInfo}>
            <div className={styles.infoItem}>
              <span className={styles.footerCheck}><Check size={15} /></span>
              <span>
                전체 진행률: <strong>{overallPercent}%</strong> ({completedCount}/{totalCount} 완료)
                {plan && (
                  <>
                    {' · '}v{plan.version}
                    {plan.generatedBy && ` · ${GENERATED_BY_LABEL[plan.generatedBy]}`}
                    {plan.sourceTemplateId && templateNameOf(plan.sourceTemplateId, templates) &&
                      ` · ${templateNameOf(plan.sourceTemplateId, templates)}`}
                  </>
                )}
              </span>
            </div>
            <button className={styles.generateBtn} onClick={() => setIsPlanActionModalOpen(true)}>
              <Zap size={16} /> 계획 생성 / 다시 생성
            </button>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 주차별 상세 */}
      {isWeekDetailsModalOpen && (
        <Modal
          open
          onClose={() => setIsWeekDetailsModalOpen(false)}
          title="주차별 상세"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsWeekDetailsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setSelectedTab(`${weekStats.week}week`);
                  setIsWeekDetailsModalOpen(false);
                }}
              >
                이 주차만 보기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.weekCard}>
            <div className={styles.weekHeader}>
              <span className={styles.weekLabel}>{weekStats.label}</span>
              <span className={styles.weekProgress}>{weekStats.percent}% 완료</span>
            </div>
            <div className={styles.weekContent}>
              <p>
                이 주차에는 {weekStats.dayCount}일 분량, 항목 {weekStats.total}개가 배정되어 있습니다.
              </p>
              <div className={styles.weekStats}>
                <div className={styles.statItem}>
                  <label>문서</label>
                  <span>{weekStats.documentCount}개</span>
                </div>
                <div className={styles.statItem}>
                  <label>체크리스트</label>
                  <span>{weekStats.checklistCount}개</span>
                </div>
                <div className={styles.statItem}>
                  <label>완료</label>
                  <span>{weekStats.done}개</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 일자 항목 분해 */}
      {isTaskBreakdownModalOpen && selectedDay && (
        <Modal
          open
          onClose={() => setIsTaskBreakdownModalOpen(false)}
          title={`${selectedDay.dayIndex}일차 항목`}
          size="lg"
          footer={<ModalSecondaryButton onClick={() => setIsTaskBreakdownModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.taskList}>
            <div className={styles.taskGroup}>
              <h4>{selectedDay.title}</h4>
              <div className={styles.taskItems}>
                {selectedDay.items.map((item) => (
                  <div key={item.id} className={styles.taskItem}>
                    [{getDisplayLabel(item.type)}] {item.title} · {getDisplayLabel(item.status)}
                    {item.description ? ` — ${item.description}` : ''}
                    {item.personName ? ` (담당 ${item.personName})` : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 일자 요약 */}
      {isDaySummaryModalOpen && selectedDay && (
        <Modal
          open
          onClose={() => setIsDaySummaryModalOpen(false)}
          title={`${selectedDay.dayIndex}일차 요약`}
          footer={
            <>
              <ModalSecondaryButton
                onClick={() => {
                  setIsDaySummaryModalOpen(false);
                  setIsTaskBreakdownModalOpen(true);
                }}
              >
                세부 항목 보기
              </ModalSecondaryButton>
              <ModalPrimaryButton
                loading={updatingItemId !== null}
                onClick={() => {
                  void handleToggleDay(selectedDay);
                  setIsDaySummaryModalOpen(false);
                }}
              >
                {selectedDay.status === 'DONE' ? '진행 중으로 변경' : '완료로 표시하기'}
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.dayCard}>
            <h3 className={styles.dayTitle}>{selectedDay.title}</h3>
            <div className={styles.dayMeta}>
              <span className={selectedDay.status === 'DONE' ? styles.statusCompleted : styles.pending}>
                {selectedDay.status === 'DONE' ? '완료' : `${selectedDay.doneCount}/${selectedDay.items.length} 진행`}
              </span>
              <span className={styles.progressLabel}>{selectedDay.progress}%</span>
            </div>
            <div className={styles.dayBreakdown}>
              {selectedDay.items.map((item) => (
                <div key={item.id} className={styles.breakdownItem}>
                  [{getDisplayLabel(item.type)}] {item.title}
                  {item.description ? ` — ${item.description}` : ''}
                  {item.personName ? ` (담당 ${item.personName})` : ''} · {getDisplayLabel(item.status)}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* 계획 생성 / 재생성 */}
      {isPlanGenerationModalOpen && (
        <Modal
          open
          onClose={() => setIsPlanGenerationModalOpen(false)}
          title="30일 온보딩 계획 생성 / 재생성"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsPlanGenerationModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton loading={isGenerating} onClick={() => void handleGeneratePlan()}>
                생성 시작
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.generationCard}>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
              사내 지식 베이스(문서)와 역할 정의를 기반으로 AI가 30일 맞춤형 인수인계 로드맵을 자동으로 생성합니다.
            </p>
            <div style={{ marginTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                사용할 템플릿
              </label>
              <select
                value={effectiveTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={isGenerating}
                style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="">자동 선택 (기본 템플릿 → AI 계획 → 기본 골격)</option>
                {usableTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.targetRole ? ` · ${getDisplayLabel(t.targetRole)}` : ''}
                    {t.isDefault ? ' · 기본' : ''}
                    {` · 항목 ${t.itemCount}개`}
                  </option>
                ))}
              </select>
              {usableTemplates.length === 0 && (
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.6 }}>
                  {templates.length === 0
                    ? '등록된 템플릿이 없습니다. 템플릿 화면에서 문서로 AI 템플릿을 만들면 문서 내용에 맞는 계획이 생성됩니다.'
                    : '이 역할에 바로 쓸 수 있는 템플릿이 없습니다. 자동 선택으로 진행하거나, 템플릿 화면에서 이 역할용 템플릿을 만들어 주세요.'}
                </p>
              )}
              {templates.length > usableTemplates.length && (
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.6 }}>
                  역할이 다르거나 문서 연결이 빠진 템플릿 {templates.length - usableTemplates.length}개는
                  선택할 수 없어 목록에서 제외했습니다.
                </p>
              )}
            </div>

            {plan?.planId && (
              <>
                <div className={styles.generationOption}>
                  <input
                    type="radio"
                    name="gen"
                    value="keep"
                    checked={generationMode === 'keep'}
                    onChange={() => setGenerationMode('keep')}
                  />
                  <label>완료한 항목은 유지하고 재생성</label>
                </div>
                <div className={styles.generationOption}>
                  <input
                    type="radio"
                    name="gen"
                    value="new"
                    checked={generationMode === 'new'}
                    onChange={() => setGenerationMode('new')}
                  />
                  <label>완료 기록 없이 전체 재생성</label>
                </div>
              </>
            )}
          </div>
          <div className={styles.generationNote}>
            <p>
              {plan?.planId
                ? generationMode === 'keep'
                  ? '이미 완료한 항목은 그대로 유지하면서 나머지를 다시 구성합니다.'
                  : '완료 기록을 유지하지 않고 계획 전체를 새로 구성합니다.'
                : '아직 계획이 없어 새로 만듭니다.'}
            </p>
          </div>
        </Modal>
      )}

      {/* 완료 현황 */}
      {isCompletionStatusModalOpen && (
        <Modal
          open
          onClose={() => setIsCompletionStatusModalOpen(false)}
          title="완료 현황"
          footer={<ModalSecondaryButton onClick={() => setIsCompletionStatusModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.statusCard}>
            <div className={styles.statusItem}>
              <label>완료된 항목</label>
              <span className={styles.statusValue}>{completedCount}개</span>
            </div>
            <div className={styles.statusItem}>
              <label>대기 중</label>
              <span className={styles.statusValue}>{pendingCount}개</span>
            </div>
            <div className={styles.statusItem}>
              <label>건너뜀</label>
              <span className={styles.statusValue}>{skippedCount}개</span>
            </div>
            <div className={styles.statusItem}>
              <label>전체 진행률</label>
              <span className={styles.statusValue} style={{ color: '#0765FC' }}>{overallPercent}%</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 빠른 작업 */}
      {isPlanActionModalOpen && (
        <Modal
          open
          onClose={() => setIsPlanActionModalOpen(false)}
          title="30일 로드맵 빠른 작업"
          footer={<ModalSecondaryButton onClick={() => setIsPlanActionModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.actionList}>
            <button className={styles.actionItem} onClick={() => void handleGeneratePlan()} disabled={isGenerating}>
              ⚡ {isGenerating ? 'AI가 계획을 생성하는 중...' : plan?.planId ? 'AI 맞춤 계획 재생성' : 'AI 맞춤 계획 생성'}
            </button>
            <button className={styles.actionItem} onClick={() => { setIsPlanActionModalOpen(false); setIsCompletionStatusModalOpen(true); }}>
              📊 완료 현황 보기
            </button>
            <button className={styles.actionItem} onClick={() => { setIsPlanActionModalOpen(false); setIsWeekDetailsModalOpen(true); }}>
              🗓 주차별 상세 보기
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
