'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, BarChart3, Bell, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Filter, HelpCircle, Search, Sparkles, TrendingUp, Users } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getAdminProgress, AdminProgressItemResponse } from '@/lib/api';
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

const DEFAULT_MOCK_NEWBIES: Newbie[] = [
  { id: 'mock-newbie-1', name: '김세원', team: '마케팅팀', day: '7일차', progress: 62, completed: 8, total: 13, status: '없음', activity: '1시간 전' },
  { id: 'mock-newbie-2', name: '정하늘', team: '마케팅팀', day: '5일차', progress: 38, completed: 4, total: 11, status: '체크리스트 지연', activity: '3시간 전' },
  { id: 'mock-newbie-3', name: '오지민', team: '마케팅팀', day: '11일차', progress: 71, completed: 12, total: 17, status: '문서 접근 제한', activity: '30분 전' },
  { id: 'mock-newbie-4', name: '윤서준', team: '마케팅팀', day: '3일차', progress: 24, completed: 2, total: 9, status: '추천 미완료', activity: '5시간 전' },
  { id: 'mock-newbie-5', name: '이수현', team: '마케팅팀', day: '9일차', progress: 50, completed: 6, total: 12, status: '없음', activity: '2시간 전' },
  { id: 'mock-newbie-6', name: '한유진', team: '브랜드팀', day: '4일차', progress: 31, completed: 3, total: 10, status: '체크리스트 지연', activity: '4시간 전' },
  { id: 'mock-newbie-7', name: '강민재', team: '콘텐츠팀', day: '13일차', progress: 78, completed: 14, total: 18, status: '없음', activity: '20분 전' },
  { id: 'mock-newbie-8', name: '박소은', team: '마케팅팀', day: '2일차', progress: 16, completed: 1, total: 7, status: '문서 접근 제한', activity: '6시간 전' },
];

const PAGE_SIZE = 5;
const AVATAR_COLORS = ['#7C3AED', '#0F8A5F', '#E85D75', '#2788D8', '#5865D8'];

export default function OnboardingProgressPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [newbies, setNewbies] = useState<Newbie[]>(DEFAULT_MOCK_NEWBIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [issueOnly, setIssueOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isProgressDetailModalOpen, setIsProgressDetailModalOpen] = useState(false);
  const [isOnboardingOverviewModalOpen, setIsOnboardingOverviewModalOpen] = useState(false);
  const [isTeamStatisticsModalOpen, setIsTeamStatisticsModalOpen] = useState(false);
  const [selectedNewbie, setSelectedNewbie] = useState<Newbie | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setIsLoading(true);
        const res = await getAdminProgress(0, 50);
        if (res && res.content && res.content.length > 0) {
          const mapped: Newbie[] = res.content.map((item: AdminProgressItemResponse, idx: number) => ({
            id: item.id || `newbie-${idx + 1}`,
            name: item.name,
            team: item.team || '마케팅팀',
            day: `${item.day || 1}일차`,
            progress: item.progress || 0,
            completed: item.completed || 0,
            total: item.total || 10,
            status: item.status || '없음',
            activity: item.activity || '최근 활동',
          }));
          setNewbies(mapped);
        }
      } catch (err) {
        console.log('관리자 진행 현황 조회 실패 (모의 데이터 유지):', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProgress();
  }, []);

  const filteredNewbies = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return newbies.filter((newbie) => {
      const matchesKeyword = !keyword || `${newbie.name} ${newbie.team}`.toLowerCase().includes(keyword);
      return matchesKeyword && (!issueOnly || newbie.status !== '없음');
    });
  }, [issueOnly, newbies, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredNewbies.length / PAGE_SIZE));
  const pagedNewbies = filteredNewbies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Dynamic statistics
  const avgProgress = newbies.length > 0 ? Math.round(newbies.reduce((acc, n) => acc + n.progress, 0) / newbies.length) : 0;
  const issueCount = newbies.filter((n) => n.status !== '없음').length;
  const activeCount = newbies.length;

  const handleSendReminder = (newbie: Newbie) => {
    showToast(`${newbie.name}님에게 온보딩 독려 알림을 발송했습니다.`, 'success');
  };

  return (
    <div className={styles.container}>
      <CommonSidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>신입 진행 현황</h1>
            <p>관리자가 신입 구성원별 온보딩 진척률과 지연 요소를 모니터링합니다.</p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.workspaceButton}
              onClick={() => router.push('/workspace-selection')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>마케팅팀 인수인계</span>
              <ChevronDown size={16} />
            </button>
            <button className={styles.iconButton} onClick={() => router.push('/notification-center')} title="알림 센터">
              <Bell size={18} />
            </button>
            <button className={styles.iconButton} onClick={() => router.push('/ai-chat')} title="AI 어시스턴트">
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        <section className={styles.summaryGrid}>
          <div className={styles.summaryCard} onClick={() => setIsTeamStatisticsModalOpen(true)} style={{ cursor: 'pointer' }}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryTitle}>평균 온보딩 진척률</span>
              <TrendingUp size={18} color="#0765FC" />
            </div>
            <div className={styles.summaryValue}>{avgProgress}%</div>
            <div className={styles.summaryDesc}>전체 {activeCount}명 신입 구성원 평균</div>
          </div>

          <div className={styles.summaryCard} onClick={() => { setIssueOnly(true); showToast('주의/지연 대상자만 필터링했습니다.', 'info'); }} style={{ cursor: 'pointer' }}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryTitle}>주의 및 지연 항목</span>
              <AlertTriangle size={18} color="#E85D75" />
            </div>
            <div className={styles.summaryValue} style={{ color: '#E85D75' }}>{issueCount}건</div>
            <div className={styles.summaryDesc}>클릭하여 지연 인원만 확인</div>
          </div>

          <div className={styles.summaryCard} onClick={() => setIsOnboardingOverviewModalOpen(true)} style={{ cursor: 'pointer' }}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryTitle}>활성 온보딩 인원</span>
              <Users size={18} color="#0F8A5F" />
            </div>
            <div className={styles.summaryValue} style={{ color: '#0F8A5F' }}>{activeCount}명</div>
            <div className={styles.summaryDesc}>진행 중인 인수인계 구성원</div>
          </div>
        </section>

        {/* Table & Controls */}
        <section className={styles.tableCard}>
          <div className={styles.tableControls}>
            <div className={styles.searchBox}>
              <Search size={16} color="#94A3B8" />
              <input
                type="text"
                placeholder="이름 또는 팀으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className={`${styles.filterButton} ${issueOnly ? styles.filterActive : ''}`}
              onClick={() => setIssueOnly(!issueOnly)}
            >
              <Filter size={16} /> {issueOnly ? '전체 보기' : '지연 인원만 보기'}
            </button>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>이름</th>
                <th>팀</th>
                <th>경과</th>
                <th>진척률</th>
                <th>완료 과제</th>
                <th>상태</th>
                <th>최근 활동</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {pagedNewbies.map((newbie, idx) => (
                <tr key={newbie.id} onClick={() => { setSelectedNewbie(newbie); setIsProgressDetailModalOpen(true); }} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className={styles.nameCell}>
                      <div className={styles.avatar} style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                        {newbie.name.charAt(0)}
                      </div>
                      <span>{newbie.name}</span>
                    </div>
                  </td>
                  <td>{newbie.team}</td>
                  <td>{newbie.day}</td>
                  <td>
                    <div className={styles.progressCell}>
                      <div className={styles.miniBar}>
                        <div className={styles.miniFill} style={{ width: `${newbie.progress}%` }}></div>
                      </div>
                      <span>{newbie.progress}%</span>
                    </div>
                  </td>
                  <td>{newbie.completed}/{newbie.total}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${newbie.status !== '없음' ? styles.statusWarning : styles.statusGood}`}>
                      {newbie.status}
                    </span>
                  </td>
                  <td className={styles.activityCell}>{newbie.activity}</td>
                  <td>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendReminder(newbie);
                      }}
                    >
                      독려 알림
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className={styles.pagination}>
            <span>총 {filteredNewbies.length}명 중 {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredNewbies.length)}명</span>
            <div className={styles.pageButtons}>
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <ChevronLeft size={16} />
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* MODALS */}

      {/* 1. Progress Detail Modal */}
      {isProgressDetailModalOpen && selectedNewbie && (
        <Modal
          open
          onClose={() => setIsProgressDetailModalOpen(false)}
          title={`${selectedNewbie.name}님의 온보딩 진척 상세`}
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsProgressDetailModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  handleSendReminder(selectedNewbie);
                  setIsProgressDetailModalOpen(false);
                }}
              >
                독려 메시지 발송
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.detailContent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className={styles.avatarLarge} style={{ backgroundColor: '#0765FC' }}>
                {selectedNewbie.name.charAt(0)}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedNewbie.name} ({selectedNewbie.team})</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>온보딩 {selectedNewbie.day} · 최근 활동: {selectedNewbie.activity}</p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>진행도</span>
                <span style={{ color: '#0765FC', fontWeight: 700 }}>{selectedNewbie.progress}% ({selectedNewbie.completed}/{selectedNewbie.total}개 완료)</span>
              </div>
              <div className={styles.miniBar} style={{ height: '8px' }}>
                <div className={styles.miniFill} style={{ width: `${selectedNewbie.progress}%` }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setIsProgressDetailModalOpen(false); router.push('/30day-plan'); }}
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                📅 30일 플랜 보기
              </button>
              <button
                onClick={() => { setIsProgressDetailModalOpen(false); router.push('/checklist'); }}
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                📋 체크리스트 보기
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Overview Modal */}
      {isOnboardingOverviewModalOpen && (
        <Modal
          open
          onClose={() => setIsOnboardingOverviewModalOpen(false)}
          title="온보딩 총괄 요약"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsOnboardingOverviewModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
              현재 활성 신입 구성원 <strong>{activeCount}명</strong>이 온보딩 로드맵을 수행 중이며, 평균 진척률은 <strong>{avgProgress}%</strong>입니다.
            </p>
            <div style={{ marginTop: '14px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>주요 모니터링 포인트:</div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: '1.7' }}>
                <li>문서 접근 권한 제한 발생 시 구성원 관리에서 역할 검토 필요</li>
                <li>체크리스트 3일 이상 지연 인원에 대한 멘토 1:1 체크인 권장</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Team Statistics Modal */}
      {isTeamStatisticsModalOpen && (
        <Modal
          open
          onClose={() => setIsTeamStatisticsModalOpen(false)}
          title="팀별 온보딩 통계"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTeamStatisticsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>마케팅팀</span>
              <span style={{ fontSize: '14px', color: '#0765FC', fontWeight: 700 }}>58% 평균 완료율</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>브랜드팀</span>
              <span style={{ fontSize: '14px', color: '#0765FC', fontWeight: 700 }}>31% 평균 완료율</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>콘텐츠팀</span>
              <span style={{ fontSize: '14px', color: '#0765FC', fontWeight: 700 }}>78% 평균 완료율</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}