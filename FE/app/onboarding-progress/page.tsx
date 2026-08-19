'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, BarChart3, Bell, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Filter, HelpCircle, Search, Sparkles, TrendingUp, Users } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import styles from './onboarding-progress.module.css';

type Newbie = {
  id: string;
  name: string;
  team: string;
  day: string;
  progress: number;
  completed: number;
  total: number;
  status: string;
  activity: string;
};

const MOCK_NEWBIES: Newbie[] = [
  { id: 'mock-newbie-1', name: '김세원', team: '마케팅팀', day: '7일차', progress: 62, completed: 8, total: 13, status: '없음', activity: '1시간 전' },
  { id: 'mock-newbie-2', name: '정하늘', team: '마케팅팀', day: '5일차', progress: 38, completed: 4, total: 11, status: '체크리스트 지연', activity: '3시간 전' },
  { id: 'mock-newbie-3', name: '오지민', team: '마케팅팀', day: '11일차', progress: 71, completed: 12, total: 17, status: '문서 접근 제한', activity: '30분 전' },
  { id: 'mock-newbie-4', name: '윤서준', team: '마케팅팀', day: '3일차', progress: 24, completed: 2, total: 9, status: '추천 미완료', activity: '5시간 전' },
  { id: 'mock-newbie-5', name: '이수현', team: '마케팅팀', day: '9일차', progress: 50, completed: 6, total: 12, status: '없음', activity: '2시간 전' },
  { id: 'mock-newbie-6', name: '한유진', team: '브랜드팀', day: '4일차', progress: 31, completed: 3, total: 10, status: '체크리스트 지연', activity: '4시간 전' },
  { id: 'mock-newbie-7', name: '강민재', team: '콘텐츠팀', day: '13일차', progress: 78, completed: 14, total: 18, status: '없음', activity: '20분 전' },
  { id: 'mock-newbie-8', name: '박소은', team: '마케팅팀', day: '2일차', progress: 16, completed: 1, total: 7, status: '문서 접근 제한', activity: '6시간 전' },
];

const WORKSPACES = ['마케팅팀 인수인계', '운영팀 인수인계', '디자인팀 인수인계'];
const PAGE_SIZE = 5;
const AVATAR_COLORS = ['#7C3AED', '#0F8A5F', '#E85D75', '#2788D8', '#5865D8'];

export default function OnboardingProgressPage() {
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [newbies] = useState<Newbie[]>(MOCK_NEWBIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [issueOnly, setIssueOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWorkspace, setSelectedWorkspace] = useState(WORKSPACES[0]);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);

  // Modal states
  const [isProgressDetailModalOpen, setIsProgressDetailModalOpen] = useState(false);
  const [isOnboardingOverviewModalOpen, setIsOnboardingOverviewModalOpen] = useState(false);
  const [isUserProgressModalOpen, setIsUserProgressModalOpen] = useState(false);
  const [isTeamStatisticsModalOpen, setIsTeamStatisticsModalOpen] = useState(false);
  const [isProgressActionModalOpen, setIsProgressActionModalOpen] = useState(false);

  const [selectedNewbie, setSelectedNewbie] = useState<Newbie | null>(null);

  const filteredNewbies = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return newbies.filter((newbie) => {
      const matchesKeyword = !keyword || `${newbie.name} ${newbie.team}`.toLowerCase().includes(keyword);
      return matchesKeyword && (!issueOnly || newbie.status !== '없음');
    });
  }, [issueOnly, newbies, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredNewbies.length / PAGE_SIZE));
  const pagedNewbies = filteredNewbies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openInsight = (kind: 'rate' | 'bottleneck' | 'checklist') => {
    if (kind === 'rate') setIsTeamStatisticsModalOpen(true);
    else setIsOnboardingOverviewModalOpen(true);
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
                <Building2 size={17} /><span>{selectedWorkspace}</span><ChevronDown size={16} className={isWorkspaceMenuOpen ? styles.chevronOpen : ''} />
              </button>
              {isWorkspaceMenuOpen && (
                <div className={styles.workspaceMenu} role="menu">
                  <div className={styles.workspaceMenuLabel}>워크스페이스 전환</div>
                  {WORKSPACES.map((workspace) => (
                    <button key={workspace} className={workspace === selectedWorkspace ? styles.workspaceOptionActive : styles.workspaceOption} onClick={() => {
                      setSelectedWorkspace(workspace);
                      setIsWorkspaceMenuOpen(false);
                      showToast(`${workspace}(으)로 전환했습니다.`, 'success');
                    }}>
                      <span>{workspace}</span>{workspace === selectedWorkspace && <Check size={16} />}
                    </button>
                  ))}
                  <Link href="/workspace-settings" className={styles.workspaceManage}>워크스페이스 관리</Link>
                </div>
              )}
            </div>
            <button className={styles.iconBtn} aria-label="알림" onClick={() => showToast('새 알림이 없습니다.', 'success')}><Bell size={20} /><span className={styles.notificationDot} /></button>
            <button className={styles.iconBtn} aria-label="도움말" onClick={() => showToast('신입별 완료율과 병목 상태를 한눈에 확인할 수 있습니다.', 'success')}><HelpCircle size={20} /></button>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.statsWrapper}>
            <button className={styles.stat} onClick={() => setIsUserProgressModalOpen(true)}><span className={styles.statIcon}><Users size={23} /></span><span className={styles.statContent}><span className={styles.summaryLabel}>진행 중 신입</span><span className={styles.summaryValue}>8 <small>명</small></span></span></button>
            <button className={styles.stat} onClick={() => setIsTeamStatisticsModalOpen(true)}><span className={styles.statIcon}><BarChart3 size={23} /></span><span className={styles.statContent}><span className={styles.summaryLabel}>평균 완료율</span><span className={styles.summaryValue}>46%</span><span className={styles.statMiniBar}><i style={{ width: '46%' }} /></span></span></button>
            <button className={`${styles.stat} ${styles.warningStat}`} onClick={() => setIsOnboardingOverviewModalOpen(true)}><span className={styles.statIcon}><AlertTriangle size={23} /></span><span className={styles.statContent}><span className={styles.summaryLabel}>병목 감지</span><span className={styles.summaryValue}>5 <small>건</small></span></span></button>
            <button className={styles.stat} onClick={() => showToast('오늘 미완료 항목 12건을 확인했습니다.', 'success')}><span className={styles.statIcon}><CalendarDays size={23} /></span><span className={styles.statContent}><span className={styles.summaryLabel}>오늘 미완료</span><span className={styles.summaryValue}>12 <small>건</small></span></span></button>
          </div>

          <div className={styles.mainLayout}>
            <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h2>신입별 진행 상황</h2>
              <div className={styles.tableTools}>
                <label className={styles.searchBox}><Search size={17} /><input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }} placeholder="이름으로 검색" /></label>
                <button className={`${styles.filterBtn} ${issueOnly ? styles.filterBtnActive : ''}`} aria-label="병목 항목만 보기" title="병목 항목만 보기" onClick={() => { setIssueOnly((value) => !value); setCurrentPage(1); }}><Filter size={17} /></button>
              </div>
            </div>
            <div className={styles.tableScroll}><table className={styles.table}>
              <thead><tr><th>신입</th><th>입사일</th><th>전체 진행률</th><th>완료 / 전체</th><th>병목 상태</th><th>최근 활동</th><th>작업</th></tr></thead>
              <tbody>
                {pagedNewbies.map((n, index) => (
                  <tr key={n.id}>
                    <td><div className={styles.name}><div className={styles.avatar} style={{ background: AVATAR_COLORS[((currentPage - 1) * PAGE_SIZE + index) % AVATAR_COLORS.length] }}>{n.name[0]}</div><div><div>{n.name}</div><div>{n.team}</div></div></div></td>
                    <td><span className={styles.dayBadge}>{n.day}</span></td>
                    <td><div className={styles.progressCell}><strong>{n.progress}%</strong><div className={styles.bar}><div style={{width: `${n.progress}%`}} /></div></div></td>
                    <td>{n.completed} / {n.total}</td>
                    <td><span className={n.status === '없음' ? styles.ok : styles.issue}>{n.status}</span></td>
                    <td><span className={styles.activity}><i />{n.activity}</span></td>
                    <td><button onClick={() => {
                      setSelectedNewbie(n);
                      setIsProgressDetailModalOpen(true);
                    }}>상세 보기</button></td>
                  </tr>
                ))}
                {pagedNewbies.length === 0 && <tr><td colSpan={7} className={styles.emptyState}>조건에 맞는 신입 구성원이 없습니다.</td></tr>}
              </tbody>
            </table></div>
            <div className={styles.pagination}><button disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} aria-label="이전 페이지"><ChevronLeft size={17} /></button><span>{filteredNewbies.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filteredNewbies.length)} / {filteredNewbies.length}</span><button disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)} aria-label="다음 페이지"><ChevronRight size={17} /></button></div>
          </div>

          <aside className={styles.rightColumn}>
            <section className={styles.insights}>
              <h3>인사이트</h3>
              <button className={styles.insight} onClick={() => openInsight('rate')}><span className={styles.insightIcon}><TrendingUp size={19} /></span><span><strong>평균 완료율 46%</strong><small>지난 주 대비 6%포인트 상승</small></span><span className={styles.sparkline} aria-hidden="true"><i /><i /><i /><i /></span></button>
              <button className={`${styles.insight} ${styles.insightWarning}`} onClick={() => openInsight('bottleneck')}><span className={styles.insightIcon}><AlertCircle size={19} /></span><span><strong>병목 항목 상위</strong><small>문서 접근 제한 5건</small></span><em>자세히 보기</em></button>
              <button className={`${styles.insight} ${styles.insightSuccess}`} onClick={() => openInsight('checklist')}><span className={styles.insightIcon}><ClipboardCheck size={19} /></span><span><strong>체크리스트 지연</strong><small>2명이 지연 중</small></span><em>자세히 보기</em></button>
            </section>
            <section className={styles.aiCard}><div><h3>더 빠른 인수인계를 위해</h3><p>AI가 병목 원인을 분석하고 개선 제안을 드려요.</p></div><button className={styles.aiBtn} onClick={() => setIsOnboardingOverviewModalOpen(true)}><Sparkles size={17} /> AI 인사이트 보기</button><Sparkles className={styles.aiDecoration} size={36} /></section>
          </aside>
          </div>
        </div>

      </main>

      {/* MODALS */}

      {/* 1. Progress Detail Modal */}
      {isProgressDetailModalOpen && selectedNewbie && (
        <Modal
          open
          onClose={() => setIsProgressDetailModalOpen(false)}
          title="신입 상세 정보"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsProgressDetailModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('onboarding-progress-0')}
                onClick={() => run('onboarding-progress-0', '처리를 완료했습니다.', () => setIsProgressDetailModalOpen(false))}
              >
                상세 보고서 보기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.detailsCard}>
            <div className={styles.detailRow}>
              <label>이름</label>
              <span>{selectedNewbie.name}</span>
            </div>
            <div className={styles.detailRow}>
              <label>팀</label>
              <span>{selectedNewbie.team}</span>
            </div>
            <div className={styles.detailRow}>
              <label>진행 일정</label>
              <span>{selectedNewbie.day}</span>
            </div>
            <div className={styles.detailRow}>
              <label>최근 활동</label>
              <span>{selectedNewbie.activity}</span>
            </div>
          </div>

          <div className={styles.progressSection}>
            <h3>진행 현황</h3>
            <div className={styles.progressRow}>
              <span>전체 진행률</span>
              <span className={styles.progressPercent}>{selectedNewbie.progress}%</span>
            </div>
            <div className={styles.progressBar}>
              <div style={{ width: `${selectedNewbie.progress}%` }}></div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <label>완료</label>
                <div className={styles.statValue}>{selectedNewbie.completed}/{selectedNewbie.total}</div>
              </div>
              <div className={styles.statItem}>
                <label>병목 상태</label>
                <div className={styles.statValue} style={{ color: selectedNewbie.status === '없음' ? '#287456' : '#985050' }}>
                  {selectedNewbie.status}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Onboarding Overview Modal */}
      {isOnboardingOverviewModalOpen && (
        <Modal
          open
          onClose={() => setIsOnboardingOverviewModalOpen(false)}
          title="인수인계 개요"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsOnboardingOverviewModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('onboarding-progress-1')}
                onClick={() => run('onboarding-progress-1', '처리를 완료했습니다.', () => setIsOnboardingOverviewModalOpen(false))}
              >
                상세 분석 보기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.overviewCard}>
            <div className={styles.overviewItem}>
              <div className={styles.overviewLabel}>평균 완료율</div>
              <div className={styles.overviewValue}>46%</div>
              <div className={styles.overviewSubtext}>지난 주 대비 6%포인트 상승</div>
            </div>
            <div className={styles.overviewItem}>
              <div className={styles.overviewLabel}>병목 항목</div>
              <div className={styles.overviewValue}>5건</div>
              <div className={styles.overviewSubtext}>문서 접근 지연</div>
            </div>
          </div>

          <div className={styles.insightList}>
            <div className={styles.insightItem}>
              <h4>마케팅팀</h4>
              <p>신입 5명 중 3명이 예정 진행률을 달성했습니다.</p>
            </div>
            <div className={styles.insightItem}>
              <h4>병목 분석</h4>
              <p>문서 접근 지연이 가장 큰 병목입니다. 담당자에게 알림을 발송하세요.</p>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. User Progress Modal */}
      {isUserProgressModalOpen && (
        <Modal
          open
          onClose={() => setIsUserProgressModalOpen(false)}
          title="사용자별 진행도"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsUserProgressModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          {newbies.slice(0, 3).map((newbie) => (
            <div key={newbie.id} className={styles.progressListItem}>
              <div className={styles.progressListHeader}>
                <span className={styles.nameSpan}>{newbie.name}</span>
                <span className={styles.progressPercent}>{newbie.progress}%</span>
              </div>
              <div className={styles.progressBar}>
                <div style={{ width: `${newbie.progress}%` }}></div>
              </div>
              <div className={styles.progressListFooter}>
                <span>{newbie.completed}/{newbie.total}</span>
                <span>{newbie.activity}</span>
              </div>
            </div>
          ))}
        </Modal>
      )}

      {/* 4. Team Statistics Modal */}
      {isTeamStatisticsModalOpen && (
        <Modal
          open
          onClose={() => setIsTeamStatisticsModalOpen(false)}
          title="팀 통계"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTeamStatisticsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>총 인원</div>
              <div className={styles.statNumber}>8</div>
              <div className={styles.statDesc}>명</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>완료율</div>
              <div className={styles.statNumber}>46%</div>
              <div className={styles.statDesc}>평균</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>병목</div>
              <div className={styles.statNumber}>5</div>
              <div className={styles.statDesc}>건</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>지연</div>
              <div className={styles.statNumber}>12</div>
              <div className={styles.statDesc}>건</div>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Progress Action Modal */}
      {isProgressActionModalOpen && selectedNewbie && (
        <Modal
          open
          onClose={() => setIsProgressActionModalOpen(false)}
          title="진행도 조치"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsProgressActionModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.actionList}>
            <button className={styles.actionItem}>진행도 리셋</button>
            <button className={styles.actionItem}>체크리스트 재할당</button>
            <button className={styles.actionItem}>진행 일정 변경</button>
            <button className={styles.actionItem}>알림 발송</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
