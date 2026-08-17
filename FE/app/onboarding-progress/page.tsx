'use client';
import React, { useState } from 'react';
import { TrendingUp, AlertCircle, Calendar, Users, BarChart3, AlertTriangle, Home, Folder, Zap, CheckSquare, Target, Lock, Settings } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import styles from './onboarding-progress.module.css';

export default function OnboardingProgressPage() {
  const { run, isPending } = useModalAction();
  const newbies = [
    { id: 1, name: '김세원', team: '마케팅팀', day: 'DAY 7', progress: 62, completed: 8, total: 13, status: '없음', activity: '1시간 전' },
    { id: 2, name: '정하영', team: '마케팅팀', day: 'DAY 5', progress: 38, completed: 4, total: 11, status: '체크리스트 지연', activity: '3시간 전' },
    { id: 3, name: '오지민', team: '마케팅팀', day: 'DAY 11', progress: 71, completed: 12, total: 17, status: '문서 검금 제한', activity: '30분 전' },
    { id: 4, name: '윤서은', team: '마케팅팀', day: 'DAY 3', progress: 24, completed: 2, total: 9, status: '주현 미루', activity: '5시간 전' },
    { id: 5, name: '이수연', team: '마케팅팀', day: 'DAY 9', progress: 50, completed: 6, total: 12, status: '없음', activity: '2시간 전' },
  ];

  // Modal states
  const [isProgressDetailModalOpen, setIsProgressDetailModalOpen] = useState(false);
  const [isOnboardingOverviewModalOpen, setIsOnboardingOverviewModalOpen] = useState(false);
  const [isUserProgressModalOpen, setIsUserProgressModalOpen] = useState(false);
  const [isTeamStatisticsModalOpen, setIsTeamStatisticsModalOpen] = useState(false);
  const [isProgressActionModalOpen, setIsProgressActionModalOpen] = useState(false);

  const [selectedNewbie, setSelectedNewbie] = useState<typeof newbies[0] | null>(null);

  return (
    <div className={styles.container}>
      <CommonSidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div><h1>신입 진행 현황</h1><p>관리자가 신입별 진행률과 병목을 확인하는 화면입니다.</p></div>
          <select><option>마케팅팀 인수인계</option></select>
        </header>

        <div className={styles.content}>
          <div className={styles.statsWrapper}>
            <div className={styles.stat}><Users size={24} /><div><div>8</div><div>명</div></div></div>
            <div className={styles.stat}><BarChart3 size={24} /><div><div>46%</div><div>완료율</div></div></div>
            <div className={styles.stat}><AlertTriangle size={24} /><div><div>5</div><div>건</div></div></div>
            <div className={styles.stat}><Calendar size={24} /><div><div>12</div><div>건</div></div></div>
          </div>

          <div className={styles.mainLayout}>
            <div className={styles.tableCard}>
            <h2>신입별 진행 상황</h2>
            <table className={styles.table}>
              <thead><tr><th>신입</th><th>입사일</th><th>전체 진행률</th><th>완료/건수</th><th>병목 상태</th><th>최근 활동</th><th>작업</th></tr></thead>
              <tbody>
                {newbies.map(n => (
                  <tr key={n.id}>
                    <td><div className={styles.name}><div className={styles.avatar}>{n.name[0]}</div><div><div>{n.name}</div><div>{n.team}</div></div></div></td>
                    <td>{n.day}</td>
                    <td><div style={{color: '#6C46A2'}}>{n.progress}%</div><div className={styles.bar}><div style={{width: `${n.progress}%`}}></div></div></td>
                    <td>{n.completed}/{n.total}</td>
                    <td><span className={n.status === '없음' ? styles.ok : styles.issue}>{n.status}</span></td>
                    <td>{n.activity}</td>
                    <td><button onClick={() => {
                      setSelectedNewbie(n);
                      setIsProgressDetailModalOpen(true);
                    }}>상세 보기</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.pagination}>1-5 / 8</div>
          </div>

          <aside className={styles.insights}>
            <h3>인사이트</h3>
            <div className={styles.insight}><TrendingUp size={20} /><div><div>평균 완료율 46%</div><div>지난 주 대비 6%p ↑</div></div></div>
            <div className={styles.insight}><AlertCircle size={20} /><div><div>병목 항목 심위</div><div>문서 접금 지연 5건</div></div></div>
            <button className={styles.aiBtn} onClick={() => setIsOnboardingOverviewModalOpen(true)}>AI 인사이트 보기</button>
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
                <div className={styles.statValue} style={{ color: selectedNewbie.status === '없음' ? '#10B981' : '#ef4444' }}>
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
              <div className={styles.overviewSubtext}>지난 주 대비 6%p ↑</div>
            </div>
            <div className={styles.overviewItem}>
              <div className={styles.overviewLabel}>병목 항목</div>
              <div className={styles.overviewValue}>5건</div>
              <div className={styles.overviewSubtext}>문서 접금 지연</div>
            </div>
          </div>

          <div className={styles.insightList}>
            <div className={styles.insightItem}>
              <h4>마케팅팀</h4>
              <p>신입 5명 중 3명이 예정 진행률을 달성했습니다.</p>
            </div>
            <div className={styles.insightItem}>
              <h4>병목 분석</h4>
              <p>문서 검금 지연이 가장 큰 병목입니다. 담당자에게 알림을 발송하세요.</p>
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
