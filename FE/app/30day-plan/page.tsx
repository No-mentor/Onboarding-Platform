'use client';

import React, { useState } from 'react';
import { Plus, Zap, Bell, HelpCircle, Check, ChevronDown } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { getDisplayLabel } from '@/lib/display-labels';
import styles from './30day-plan.module.css';

const MOCK_PLAN_TITLES = [
  '업무 이해 및 환경 설정', '핵심 업무 프로세스 학습', '주요 프로젝트 및 자료 파악', '브랜드 가이드 이해', '주간회의 참여',
  '거래처 커뮤니케이션 파악', '첫 주 피드백', '예산안 작성 규칙 학습', '캠페인 성과 지표 이해', '콘텐츠 검수 절차 실습',
  '광고 계정 구조 파악', '월간 보고서 작성 연습', '담당 업무 섀도잉', '2주차 회고', '소규모 업무 단독 수행',
  '협업 부서 업무 이해', '마케팅 도구 활용', '데이터 정리 실습', '캠페인 일정 작성', '중간 피드백 반영',
  '업무 문서 최신화', '이슈 대응 절차 학습', '성과 보고 초안 작성', '담당자 검토 요청', '개선 사항 반영',
  '최종 업무 점검', '인수인계 누락 확인', '향후 목표 작성', '최종 피드백', '인수인계 완료 및 향후 계획',
];

const MOCK_PLAN_DAYS = MOCK_PLAN_TITLES.map((title, index) => ({
  id: `mock-plan-day-${index + 1}`,
  dayIndex: index + 1,
  title,
  status: index === 0 ? 'COMPLETED' : index < 12 ? 'IN_PROGRESS' : 'NOT_STARTED',
  type: index % 3 === 0 ? 'DOCUMENT' : index % 3 === 1 ? 'CHECKLIST' : 'PRACTICE',
  description: index % 3 === 0 ? '[목업] 온보딩 참고자료.pdf 확인 · 체크리스트 2개' : '체크리스트 2개 · 실습 1개',
  personName: index < 14 ? '이민수 멘토' : '김세원',
  progress: index === 0 ? 25 : index === 1 ? 40 : index === 2 ? 30 : index < 7 ? 65 : index < 12 ? 40 : 0,
  documentCount: (index % 3) + 1,
  checklistCount: (index % 2) + 2,
  practiceCount: index % 4 === 2 ? 1 : 0,
  meetingCount: index === 0 ? 1 : 0,
}));

type PlanDay = (typeof MOCK_PLAN_DAYS)[number];

export default function ThirtyDayPlanPage() {
  const { run, isPending } = useModalAction();
  const [selectedTab, setSelectedTab] = useState('all');
  const [expandedDays, setExpandedDays] = useState<number[]>([]);

  // Modal states
  const [isWeekDetailsModalOpen, setIsWeekDetailsModalOpen] = useState(false);
  const [isDaySummaryModalOpen, setIsDaySummaryModalOpen] = useState(false);
  const [isPlanGenerationModalOpen, setIsPlanGenerationModalOpen] = useState(false);
  const [isCompletionStatusModalOpen, setIsCompletionStatusModalOpen] = useState(false);
  const [isPlanEditModalOpen, setIsPlanEditModalOpen] = useState(false);
  const [isTaskBreakdownModalOpen, setIsTaskBreakdownModalOpen] = useState(false);
  const [isPlanActionModalOpen, setIsPlanActionModalOpen] = useState(false);

  const [selectedDay, setSelectedDay] = useState<PlanDay | null>(null);
  const days = MOCK_PLAN_DAYS;

  const visibleDays = selectedTab === 'all'
    ? [days[0], days[1], days[2], days[29]]
    : days.filter((day) => {
        const week = Number(selectedTab[0]);
        return day.dayIndex >= (week - 1) * 7 + 1 && day.dayIndex <= (week === 4 ? 30 : week * 7);
      });

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
            <h1 className={styles.heading}>30일 인수인계 계획</h1>
            <p className={styles.description}>AI가 생성한 계획을 일자별로 확인하고 항목 상태를 관리하세요.</p>
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
                  {tab === 'all' ? '전체 30일' : tab === '1week' ? '1주차' : tab === '2week' ? '2주차' : tab === '3week' ? '3주차' : '4주차'}
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
                    <div className={`${styles.dot} ${item.status === 'COMPLETED' ? styles.completed : item.status === 'IN_PROGRESS' ? styles.inProgress : ''}`}>
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
                      <span className={styles.progressPercent}>{item.progress}%</span>
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
              <span>기존 완료 항목을 유지하면서 계획을 다시 생성할 수 있습니다.</span>
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
              <span className={styles.weekLabel}>1주차 (1~7일차)</span>
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
          title={`${selectedDay.dayIndex}일차 요약`}
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
            <p>계획 생성 시 인공지능이 현재 진행도와 팀 특성을 고려하여 맞춤 계획을 작성합니다.</p>
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
              <span className={styles.statusValue}>1개 (1일차)</span>
            </div>
            <div className={styles.statusItem}>
              <label>진행 중</label>
              <span className={styles.statusValue}>3개 (2일차, 3일차 등)</span>
            </div>
            <div className={styles.statusItem}>
              <label>대기 중</label>
              <span className={styles.statusValue}>26개</span>
            </div>
            <div className={styles.statusItem}>
              <label>전체 진행률</label>
              <span className={styles.statusValue} style={{ color: '#0765FC' }}>11%</span>
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
          title={`${selectedDay.dayIndex}일차 항목`}
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
