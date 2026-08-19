'use client';
import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Calendar, Users, BarChart3, AlertTriangle, Home, Folder, Zap, CheckSquare, Target, Lock, Settings } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import { getAdminProgress, type AdminProgressItemResponse } from '@/lib/api';
import styles from './onboarding-progress.module.css';

export default function OnboardingProgressPage() {
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [newbies, setNewbies] = useState<AdminProgressItemResponse[]>([]);

  // Modal states
  const [isProgressDetailModalOpen, setIsProgressDetailModalOpen] = useState(false);
  const [isOnboardingOverviewModalOpen, setIsOnboardingOverviewModalOpen] = useState(false);
  const [isUserProgressModalOpen, setIsUserProgressModalOpen] = useState(false);
  const [isTeamStatisticsModalOpen, setIsTeamStatisticsModalOpen] = useState(false);
  const [isProgressActionModalOpen, setIsProgressActionModalOpen] = useState(false);

  const [selectedNewbie, setSelectedNewbie] = useState<AdminProgressItemResponse | null>(null);

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        setIsLoading(true);
        const response = await getAdminProgress();
        setNewbies(response.items ?? []);
      } catch (err) {
        console.error('신입 진행 현황 로드 실패:', err);
        showToast('신입 진행 현황을 불러올 수 없습니다', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadProgress();
  }, []);

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
              <thead><tr><th>신입</th><th>진행 일차</th><th>전체 진행률</th><th>계획 상태</th><th>작업</th></tr></thead>
              <tbody>
                {newbies.map(n => {
                  const percent = Math.round(Number(n.progressPercent ?? 0));
                  return (
                  <tr key={n.userId}>
                    <td><div className={styles.name}><div className={styles.avatar}>{n.name.trim().charAt(0)}</div><div><div>{n.name}</div><div>{n.email}</div></div></div></td>
                    <td>{n.currentDay}일차</td>
                    <td><div style={{color: '#6C46A2'}}>{percent}%</div><div className={styles.bar}><div style={{width: `${percent}%`}}></div></div></td>
                    <td><span className={n.status === 'ACTIVE' ? styles.ok : styles.issue}>{n.status}</span></td>
                    <td><button onClick={() => {
                      setSelectedNewbie(n);
                      setIsProgressDetailModalOpen(true);
                    }}>상세 보기</button></td>
                  </tr>
                  );
                })}
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
              <label>이메일</label>
              <span>{selectedNewbie.email}</span>
            </div>
            <div className={styles.detailRow}>
              <label>진행 일차</label>
              <span>{selectedNewbie.currentDay}일차</span>
            </div>
            <div className={styles.detailRow}>
              <label>계획 상태</label>
              <span>{selectedNewbie.status}</span>
            </div>
          </div>

          <div className={styles.progressSection}>
            <h3>진행 현황</h3>
            <div className={styles.progressRow}>
              <span>전체 진행률</span>
              <span className={styles.progressPercent}>{Math.round(Number(selectedNewbie.progressPercent ?? 0))}%</span>
            </div>
            <div className={styles.progressBar}>
              <div style={{ width: `${Math.round(Number(selectedNewbie.progressPercent ?? 0))}%` }}></div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <label>진행 일차</label>
                <div className={styles.statValue}>{selectedNewbie.currentDay}일차</div>
              </div>
              <div className={styles.statItem}>
                <label>계획 상태</label>
                <div className={styles.statValue} style={{ color: selectedNewbie.status === 'ACTIVE' ? '#10B981' : '#ef4444' }}>
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
          {newbies.slice(0, 3).map((newbie) => {
            const percent = Math.round(Number(newbie.progressPercent ?? 0));
            return (
            <div key={newbie.userId} className={styles.progressListItem}>
              <div className={styles.progressListHeader}>
                <span className={styles.nameSpan}>{newbie.name}</span>
                <span className={styles.progressPercent}>{percent}%</span>
              </div>
              <div className={styles.progressBar}>
                <div style={{ width: `${percent}%` }}></div>
              </div>
              <div className={styles.progressListFooter}>
                <span>{newbie.currentDay}일차</span>
                <span>{newbie.status}</span>
              </div>
            </div>
            );
          })}
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
