'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, BarChart3, Bell, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Filter, HelpCircle, Search, Sparkles, TrendingUp, Users } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useMe } from '@/components/require-workspace';
import { saveWorkspaceId } from '@/lib/storage';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  getAdminProgress,
  getAdminProgressDetail,
  getOnboardingPlanById,
  regenerateOnboardingPlan,
  type AdminProgressDetailResponse,
  type AdminProgressItemResponse,
  type PlanResponse,
} from '@/lib/api';
import styles from './onboarding-progress.module.css';

const PAGE_SIZE = 5;
/** 서버가 한 번에 주는 최대치. 통계를 전체 기준으로 내기 위해 크게 받아 온다 */
const FETCH_SIZE = 100;
const AVATAR_COLORS = ['#7C3AED', '#0F8A5F', '#E85D75', '#2788D8', '#5865D8'];

/** AI 인사이트 모달에서 한 번에 상세를 받아 올 최대 인원 */
const INSIGHT_LIMIT = 5;

export default function OnboardingProgressPage() {
  const me = useMe();
  const { showToast } = useToast();

  const [newbies, setNewbies] = useState<AdminProgressItemResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [issueOnly, setIssueOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);

  const [isProgressDetailModalOpen, setIsProgressDetailModalOpen] = useState(false);
  const [isOnboardingOverviewModalOpen, setIsOnboardingOverviewModalOpen] = useState(false);
  const [isUserProgressModalOpen, setIsUserProgressModalOpen] = useState(false);
  const [isTeamStatisticsModalOpen, setIsTeamStatisticsModalOpen] = useState(false);
  const [isProgressActionModalOpen, setIsProgressActionModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [selectedNewbie, setSelectedNewbie] = useState<AdminProgressItemResponse | null>(null);
  const [detail, setDetail] = useState<AdminProgressDetailResponse | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  /** 상세 모달에서 함께 보여 줄 그 신입의 30일 계획 */
  const [detailPlan, setDetailPlan] = useState<PlanResponse | null>(null);

  const [insights, setInsights] = useState<AdminProgressDetailResponse[]>([]);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAdminProgress(0, FETCH_SIZE);
      setNewbies(response.items ?? []);
      setTotalElements(response.totalElements ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '진행 현황을 불러오지 못했습니다.');
      setNewbies([]);
      setTotalElements(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const withPlan = newbies.filter(n => n.planId !== null);
    const average =
      withPlan.length === 0
        ? 0
        : Math.round(withPlan.reduce((sum, n) => sum + Number(n.progressPercent ?? 0), 0) / withPlan.length);
    return {
      total: totalElements || newbies.length,
      average,
      atRisk: newbies.filter(n => n.status === 'AT_RISK').length,
      noPlan: newbies.filter(n => n.status === 'NO_PLAN').length,
      ahead: newbies.filter(n => n.status === 'AHEAD').length,
    };
  }, [newbies, totalElements]);

  const filteredNewbies = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return newbies.filter(newbie => {
      const haystack = `${newbie.name ?? ''} ${newbie.email ?? ''}`.toLowerCase();
      const matchesKeyword = !keyword || haystack.includes(keyword);
      const hasIssue = newbie.status === 'AT_RISK' || newbie.status === 'NO_PLAN';
      return matchesKeyword && (!issueOnly || hasIssue);
    });
  }, [issueOnly, newbies, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredNewbies.length / PAGE_SIZE));
  const pagedNewbies = filteredNewbies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openDetail = async (newbie: AdminProgressItemResponse) => {
    setSelectedNewbie(newbie);
    setDetail(null);
    setDetailPlan(null);
    setDetailError(null);
    setIsProgressDetailModalOpen(true);
    setIsDetailLoading(true);
    try {
      // 진행 요약과 실제 계획 항목을 함께 받아 온다 (계획이 없으면 planId 가 null)
      const [response, planResponse] = await Promise.all([
        getAdminProgressDetail(newbie.userId),
        newbie.planId ? getOnboardingPlanById(newbie.planId).catch(() => null) : Promise.resolve(null),
      ]);
      setDetail(response);
      setDetailPlan(planResponse);
    } catch (err) {
      // 계획이 없는 신입은 서버가 404 를 준다
      setDetailError(err instanceof Error ? err.message : '상세 정보를 불러오지 못했습니다.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  /** 관리자가 신입의 30일 계획을 다시 만들어 준다 */
  const handleRegenerate = async (newbie: AdminProgressItemResponse, keepCompleted: boolean) => {
    if (!newbie.planId) return;
    setIsRegenerating(true);
    try {
      await regenerateOnboardingPlan(newbie.planId, { preserveCompleted: keepCompleted });
      showToast(`${newbie.name ?? '신입'}의 계획을 다시 생성했습니다.`, 'success');
      setIsProgressActionModalOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '계획 재생성에 실패했습니다.', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  /** 지연 위험 신입의 실제 인사이트를 모아서 보여 준다 */
  const openOverview = async () => {
    setIsOnboardingOverviewModalOpen(true);
    setIsInsightsLoading(true);
    try {
      const targets = newbies
        .filter(n => n.planId !== null && (n.status === 'AT_RISK' || n.status === 'ON_TRACK'))
        .slice(0, INSIGHT_LIMIT);
      const results = await Promise.all(
        targets.map(target => getAdminProgressDetail(target.userId).catch(() => null))
      );
      setInsights(results.filter((item): item is AdminProgressDetailResponse => item !== null));
    } finally {
      setIsInsightsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <CommonSidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div><h1>신입 진행 현황</h1><p>관리자가 신입별 진행률과 병목을 확인하는 화면입니다.</p></div>
          <div className={styles.headerActions}>
            <div className={styles.workspaceWrap}>
              <button className={styles.workspaceBtn} onClick={() => setIsWorkspaceMenuOpen((open) => !open)} aria-expanded={isWorkspaceMenuOpen}>
                <Building2 size={17} />
                <span>{me?.currentWorkspace?.name ?? '업무 공간'}</span>
                <ChevronDown size={16} className={isWorkspaceMenuOpen ? styles.chevronOpen : ''} />
              </button>
              {isWorkspaceMenuOpen && (
                <div className={styles.workspaceMenu} role="menu">
                  <div className={styles.workspaceMenuLabel}>워크스페이스 전환</div>
                  {(me?.workspaces ?? []).map((workspace) => (
                    <button
                      key={workspace.id}
                      className={workspace.id === me?.currentWorkspace?.id ? styles.workspaceOptionActive : styles.workspaceOption}
                      onClick={() => {
                        setIsWorkspaceMenuOpen(false);
                        if (workspace.id === me?.currentWorkspace?.id) return;
                        saveWorkspaceId(workspace.id);
                        window.location.reload();
                      }}
                    >
                      <span>{workspace.name}</span>
                      {workspace.id === me?.currentWorkspace?.id && <Check size={16} />}
                    </button>
                  ))}
                  <Link href="/workspace-settings" className={styles.workspaceManage}>워크스페이스 관리</Link>
                </div>
              )}
            </div>
            <button className={styles.iconBtn} aria-label="알림" onClick={() => setIsOnboardingOverviewModalOpen(true)}>
              <Bell size={20} />
              {stats.atRisk > 0 && <span className={styles.notificationDot} />}
            </button>
            <button
              className={styles.iconBtn}
              aria-label="도움말"
              onClick={() => showToast('신입별 완료율과 병목 상태를 한눈에 확인할 수 있습니다.', 'success')}
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </header>

        <div className={styles.content}>
          {error && (
            <div className={styles.emptyState}>
              {error}{' '}
              <button className={styles.filterBtn} onClick={() => void load()}>다시 시도</button>
            </div>
          )}

          <div className={styles.statsWrapper}>
            <button className={styles.stat} onClick={() => setIsUserProgressModalOpen(true)}>
              <span className={styles.statIcon}><Users size={23} /></span>
              <span className={styles.statContent}>
                <span className={styles.summaryLabel}>진행 중 신입</span>
                <span className={styles.summaryValue}>{stats.total} <small>명</small></span>
              </span>
            </button>
            <button className={styles.stat} onClick={() => setIsTeamStatisticsModalOpen(true)}>
              <span className={styles.statIcon}><BarChart3 size={23} /></span>
              <span className={styles.statContent}>
                <span className={styles.summaryLabel}>평균 완료율</span>
                <span className={styles.summaryValue}>{stats.average}%</span>
                <span className={styles.statMiniBar}><i style={{ width: `${stats.average}%` }} /></span>
              </span>
            </button>
            <button className={`${styles.stat} ${styles.warningStat}`} onClick={() => void openOverview()}>
              <span className={styles.statIcon}><AlertTriangle size={23} /></span>
              <span className={styles.statContent}>
                <span className={styles.summaryLabel}>지연 위험</span>
                <span className={styles.summaryValue}>{stats.atRisk} <small>명</small></span>
              </span>
            </button>
            <button className={styles.stat} onClick={() => { setIssueOnly(true); setCurrentPage(1); }}>
              <span className={styles.statIcon}><CalendarDays size={23} /></span>
              <span className={styles.statContent}>
                <span className={styles.summaryLabel}>계획 미생성</span>
                <span className={styles.summaryValue}>{stats.noPlan} <small>명</small></span>
              </span>
            </button>
          </div>

          <div className={styles.mainLayout}>
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h2>신입별 진행 상황</h2>
                <div className={styles.tableTools}>
                  <label className={styles.searchBox}>
                    <Search size={17} />
                    <input
                      value={searchTerm}
                      onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }}
                      placeholder="이름 또는 이메일로 검색"
                    />
                  </label>
                  <button
                    className={`${styles.filterBtn} ${issueOnly ? styles.filterBtnActive : ''}`}
                    aria-label="병목 항목만 보기"
                    title="병목 항목만 보기"
                    onClick={() => { setIssueOnly((value) => !value); setCurrentPage(1); }}
                  >
                    <Filter size={17} />
                  </button>
                </div>
              </div>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>신입</th>
                      <th>진행 일정</th>
                      <th>전체 진행률</th>
                      <th>계획</th>
                      <th>상태</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={6} className={styles.emptyState}>불러오는 중...</td></tr>
                    ) : pagedNewbies.length === 0 ? (
                      <tr><td colSpan={6} className={styles.emptyState}>조건에 맞는 신입 구성원이 없습니다.</td></tr>
                    ) : (
                      pagedNewbies.map((n, index) => {
                        const progress = Math.round(Number(n.progressPercent ?? 0));
                        const hasIssue = n.status === 'AT_RISK' || n.status === 'NO_PLAN';
                        return (
                          <tr key={n.userId}>
                            <td>
                              <div className={styles.name}>
                                <div
                                  className={styles.avatar}
                                  style={{ background: AVATAR_COLORS[((currentPage - 1) * PAGE_SIZE + index) % AVATAR_COLORS.length] }}
                                >
                                  {(n.name ?? '?').charAt(0)}
                                </div>
                                <div>
                                  <div>{n.name ?? '이름 없음'}</div>
                                  <div>{n.email ?? '-'}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={styles.dayBadge}>
                                {n.currentDay > 0 ? `${n.currentDay}일차` : '시작 전'}
                              </span>
                            </td>
                            <td>
                              <div className={styles.progressCell}>
                                <strong>{progress}%</strong>
                                <div className={styles.bar}><div style={{ width: `${progress}%` }} /></div>
                              </div>
                            </td>
                            <td>
                              <span className={styles.activity}><i />{n.planId ? '계획 있음' : '계획 없음'}</span>
                            </td>
                            <td><span className={hasIssue ? styles.issue : styles.ok}>{getDisplayLabel(n.status)}</span></td>
                            <td><button onClick={() => void openDetail(n)}>상세 보기</button></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} aria-label="이전 페이지">
                  <ChevronLeft size={17} />
                </button>
                <span>
                  {filteredNewbies.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
                  {Math.min(currentPage * PAGE_SIZE, filteredNewbies.length)} / {filteredNewbies.length}
                  {totalElements > newbies.length && ` (전체 ${totalElements}명 중 ${newbies.length}명 조회)`}
                </span>
                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)} aria-label="다음 페이지">
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <aside className={styles.rightColumn}>
              <section className={styles.insights}>
                <h3>인사이트</h3>
                <button className={styles.insight} onClick={() => setIsTeamStatisticsModalOpen(true)}>
                  <span className={styles.insightIcon}><TrendingUp size={19} /></span>
                  <span>
                    <strong>평균 완료율 {stats.average}%</strong>
                    <small>계획이 있는 신입 {newbies.filter(n => n.planId !== null).length}명 기준</small>
                  </span>
                  <span className={styles.sparkline} aria-hidden="true"><i /><i /><i /><i /></span>
                </button>
                <button className={`${styles.insight} ${styles.insightWarning}`} onClick={() => void openOverview()}>
                  <span className={styles.insightIcon}><AlertCircle size={19} /></span>
                  <span>
                    <strong>지연 위험</strong>
                    <small>기대 진행률보다 뒤처진 신입 {stats.atRisk}명</small>
                  </span>
                  <em>자세히 보기</em>
                </button>
                <button className={`${styles.insight} ${styles.insightSuccess}`} onClick={() => { setIssueOnly(true); setCurrentPage(1); }}>
                  <span className={styles.insightIcon}><ClipboardCheck size={19} /></span>
                  <span>
                    <strong>계획 미생성</strong>
                    <small>30일 계획이 없는 신입 {stats.noPlan}명</small>
                  </span>
                  <em>목록에서 보기</em>
                </button>
              </section>
              <section className={styles.aiCard}>
                <div>
                  <h3>더 빠른 인수인계를 위해</h3>
                  <p>서버가 계산한 병목 원인과 개선 제안을 확인하세요.</p>
                </div>
                <button className={styles.aiBtn} onClick={() => void openOverview()}>
                  <Sparkles size={17} /> 인사이트 보기
                </button>
                <Sparkles className={styles.aiDecoration} size={36} />
              </section>
            </aside>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. 신입 상세 */}
      {isProgressDetailModalOpen && selectedNewbie && (
        <Modal
          open
          onClose={() => setIsProgressDetailModalOpen(false)}
          title="신입 상세 정보"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsProgressDetailModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton onClick={() => { setIsProgressDetailModalOpen(false); setIsProgressActionModalOpen(true); }}>
                조치하기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.detailsCard}>
            <div className={styles.detailRow}>
              <label>이름</label>
              <span>{selectedNewbie.name ?? '이름 없음'}</span>
            </div>
            <div className={styles.detailRow}>
              <label>이메일</label>
              <span>{selectedNewbie.email ?? '-'}</span>
            </div>
            <div className={styles.detailRow}>
              <label>진행 일정</label>
              <span>{selectedNewbie.currentDay > 0 ? `${selectedNewbie.currentDay}일차` : '시작 전'}</span>
            </div>
            <div className={styles.detailRow}>
              <label>상태</label>
              <span>{getDisplayLabel(selectedNewbie.status)}</span>
            </div>
          </div>

          <div className={styles.progressSection}>
            <h3>진행 현황</h3>
            <div className={styles.progressRow}>
              <span>전체 진행률</span>
              <span className={styles.progressPercent}>
                {Math.round(Number(detail?.progressPercent ?? selectedNewbie.progressPercent ?? 0))}%
              </span>
            </div>
            <div className={styles.progressBar}>
              <div style={{ width: `${Math.round(Number(detail?.progressPercent ?? selectedNewbie.progressPercent ?? 0))}%` }}></div>
            </div>

            {isDetailLoading ? (
              <div className={styles.emptyState}>상세 정보를 불러오는 중...</div>
            ) : detailError ? (
              <div className={styles.emptyState}>{detailError}</div>
            ) : detail ? (
              <>
                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <label>기한 경과 항목</label>
                    <div className={styles.statValue}>{detail.overdueItems.length}건</div>
                  </div>
                  <div className={styles.statItem}>
                    <label>계획</label>
                    <div className={styles.statValue}>{detail.planId ? '있음' : '없음'}</div>
                  </div>
                </div>

                {detail.overdueItems.length > 0 && (
                  <div className={styles.insightList}>
                    {detail.overdueItems.map(item => (
                      <div key={item.id} className={styles.insightItem}>
                        <h4>{item.dayIndex}일차</h4>
                        <p>{item.title}</p>
                      </div>
                    ))}
                  </div>
                )}

                {detail.insights && (
                  <div className={styles.insightList}>
                    <div className={styles.insightItem}>
                      <h4>분석</h4>
                      <p>{detail.insights}</p>
                    </div>
                  </div>
                )}

                {detailPlan && (
                  <div className={styles.insightList}>
                    <div className={styles.insightItem}>
                      <h4>30일 계획</h4>
                      <p>
                        {detailPlan.startDate} ~ {detailPlan.endDate} · 항목 {detailPlan.itemCount}개 ·{' '}
                        {getDisplayLabel(detailPlan.status)}
                      </p>
                    </div>
                    {(detailPlan.items ?? [])
                      .filter(item => item.status === 'PENDING')
                      .slice(0, 5)
                      .map(item => (
                        <div key={item.id} className={styles.insightItem}>
                          <h4>{item.dayIndex}일차 · {getDisplayLabel(item.type)}</h4>
                          <p>{item.title}</p>
                        </div>
                      ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </Modal>
      )}

      {/* 2. 인사이트 개요 */}
      {isOnboardingOverviewModalOpen && (
        <Modal
          open
          onClose={() => setIsOnboardingOverviewModalOpen(false)}
          title="인수인계 개요"
          size="lg"
          footer={<ModalSecondaryButton onClick={() => setIsOnboardingOverviewModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.overviewCard}>
            <div className={styles.overviewItem}>
              <div className={styles.overviewLabel}>평균 완료율</div>
              <div className={styles.overviewValue}>{stats.average}%</div>
              <div className={styles.overviewSubtext}>계획이 있는 신입 기준</div>
            </div>
            <div className={styles.overviewItem}>
              <div className={styles.overviewLabel}>지연 위험</div>
              <div className={styles.overviewValue}>{stats.atRisk}명</div>
              <div className={styles.overviewSubtext}>계획 미생성 {stats.noPlan}명</div>
            </div>
          </div>

          <div className={styles.insightList}>
            {isInsightsLoading ? (
              <div className={styles.insightItem}><p>인사이트를 불러오는 중...</p></div>
            ) : insights.length === 0 ? (
              <div className={styles.insightItem}><p>표시할 인사이트가 없습니다.</p></div>
            ) : (
              insights.map(item => (
                <div key={item.userId} className={styles.insightItem}>
                  <h4>{item.name} · {Math.round(Number(item.progressPercent ?? 0))}%</h4>
                  <p>
                    {item.insights || '분석 결과가 없습니다.'}
                    {item.overdueItems.length > 0 ? ` (기한 경과 ${item.overdueItems.length}건)` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* 3. 사용자별 진행도 */}
      {isUserProgressModalOpen && (
        <Modal
          open
          onClose={() => setIsUserProgressModalOpen(false)}
          title="사용자별 진행도"
          size="lg"
          footer={<ModalSecondaryButton onClick={() => setIsUserProgressModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          {newbies.length === 0 ? (
            <div className={styles.emptyState}>신입 구성원이 없습니다.</div>
          ) : (
            newbies.map((newbie) => {
              const progress = Math.round(Number(newbie.progressPercent ?? 0));
              return (
                <div key={newbie.userId} className={styles.progressListItem}>
                  <div className={styles.progressListHeader}>
                    <span className={styles.nameSpan}>{newbie.name ?? '이름 없음'}</span>
                    <span className={styles.progressPercent}>{progress}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className={styles.progressListFooter}>
                    <span>{newbie.currentDay > 0 ? `${newbie.currentDay}일차` : '시작 전'}</span>
                    <span>{getDisplayLabel(newbie.status)}</span>
                  </div>
                </div>
              );
            })
          )}
        </Modal>
      )}

      {/* 4. 진행도 조치 */}
      {isProgressActionModalOpen && selectedNewbie && (
        <Modal
          open
          onClose={() => setIsProgressActionModalOpen(false)}
          title="진행도 조치"
          subtitle={`${selectedNewbie.name ?? '이름 없음'} · ${getDisplayLabel(selectedNewbie.status)}`}
          footer={<ModalSecondaryButton onClick={() => setIsProgressActionModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.actionList}>
            <button
              className={styles.actionItem}
              disabled={!selectedNewbie.planId || isRegenerating}
              onClick={() => void handleRegenerate(selectedNewbie, true)}
            >
              {isRegenerating ? '재생성 중...' : '계획 재생성 (완료 항목 유지)'}
            </button>
            <button
              className={styles.actionItem}
              disabled={!selectedNewbie.planId || isRegenerating}
              onClick={() => void handleRegenerate(selectedNewbie, false)}
            >
              계획 전체 재생성
            </button>
            <button
              className={styles.actionItem}
              onClick={() => { setIsProgressActionModalOpen(false); void openDetail(selectedNewbie); }}
            >
              기한 경과 항목 다시 보기
            </button>
          </div>
          {!selectedNewbie.planId && (
            <p className={styles.emptyState}>
              아직 30일 계획이 없어 재생성할 수 없습니다. 본인이 계획을 먼저 생성해야 합니다.
            </p>
          )}
        </Modal>
      )}

      {/* 5. 팀 통계 */}
      {isTeamStatisticsModalOpen && (
        <Modal
          open
          onClose={() => setIsTeamStatisticsModalOpen(false)}
          title="팀 통계"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTeamStatisticsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton onClick={() => { setIsTeamStatisticsModalOpen(false); void openOverview(); }}>
                인사이트 보기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>총 인원</div>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statDesc}>명</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>평균 완료율</div>
              <div className={styles.statNumber}>{stats.average}%</div>
              <div className={styles.statDesc}>계획 보유자 기준</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>지연 위험</div>
              <div className={styles.statNumber}>{stats.atRisk}</div>
              <div className={styles.statDesc}>명</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>앞서 진행</div>
              <div className={styles.statNumber}>{stats.ahead}</div>
              <div className={styles.statDesc}>명</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
