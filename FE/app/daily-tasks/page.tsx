'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Lightbulb, Bell, HelpCircle, Zap, ClipboardList, Check, ChevronDown } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getRecommendationsToday, completeRecommendation, RecommendationResponse } from '@/lib/api';
import styles from './daily-tasks.module.css';

const DEFAULT_MOCK_TASKS = {
  document: [
    { id: 'mock-1', name: '[필수 온보딩] 행사운영가이드.pdf 확인', type: 'pdf', status: 'done', time: '10:30까지', description: '추천 이유 · 오늘 선행 필요' },
    { id: 'mock-2', name: '[업무 문서] 예산안_작성규칙.xlsx 검토', type: 'excel', status: 'pending', time: '14:00까지', description: '예상 소요 · 20분' },
  ],
  checklist: [
    { id: 'mock-3', name: '신입 계정 권한 및 그룹웨어 확인', type: 'checklist', status: 'done', time: '14:00까지', description: '추천 이유 · 오늘 선행 필요' },
    { id: 'mock-4', name: '주간회의 자료 위치 파악 및 준비', type: 'checklist', status: 'pending', time: '16:00까지', description: '예상 소요 · 20분' },
  ],
  practice: [
    { id: 'mock-5', name: '예산 샘플 시트 작성 실습', type: 'practice', status: 'done', time: '16:00까지', description: '추천 이유 · 오늘 선행 필요' },
    { id: 'mock-6', name: '거래처 연락망 최신화 정리', type: 'practice', status: 'pending', time: '17:00까지', description: '예상 소요 · 20분' },
  ],
};

export default function DailyTasksPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Modal states
  const [isDailyGoalsModalOpen, setIsDailyGoalsModalOpen] = useState(false);
  const [isTaskActionsModalOpen, setIsTaskActionsModalOpen] = useState(false);
  const [isMeetingNotesModalOpen, setIsMeetingNotesModalOpen] = useState(false);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [tasks, setTasks] = useState(DEFAULT_MOCK_TASKS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedNotes = localStorage.getItem('daily_meeting_notes');
    if (savedNotes) setMeetingNotes(savedNotes);

    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const res = await getRecommendationsToday();
        if (res && res.recommendations && res.recommendations.length > 0) {
          const docs: any[] = [];
          const checks: any[] = [];
          const practices: any[] = [];

          res.recommendations.forEach((item: RecommendationResponse, idx: number) => {
            const taskObj = {
              id: item.id || `rec-${idx + 1}`,
              name: item.title,
              type: item.type === 'DOCUMENT' ? (item.title.endsWith('.xlsx') ? 'excel' : 'pdf') : 'checklist',
              status: item.completed ? 'done' : 'pending',
              time: '18:00까지',
              description: item.reason || 'AI 추천 과제',
            };
            if (item.type === 'DOCUMENT') docs.push(taskObj);
            else if (item.type === 'CHECKLIST') checks.push(taskObj);
            else practices.push(taskObj);
          });

          setTasks({
            document: docs.length > 0 ? docs : DEFAULT_MOCK_TASKS.document,
            checklist: checks.length > 0 ? checks : DEFAULT_MOCK_TASKS.checklist,
            practice: practices.length > 0 ? practices : DEFAULT_MOCK_TASKS.practice,
          });
        }
      } catch (err) {
        console.log('오늘의 추천 과제 조회 실패 (모의 데이터 유지):', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const toggleTaskComplete = async (taskId: string | number, category: 'document' | 'checklist' | 'practice') => {
    const target = tasks[category].find((t) => t.id === taskId);
    if (!target) return;
    const nextStatus = target.status === 'done' ? 'pending' : 'done';

    setTasks((prevTasks) => ({
      ...prevTasks,
      [category]: prevTasks[category].map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task
      ),
    }));

    if (typeof taskId === 'string' && !taskId.startsWith('mock-')) {
      try {
        await completeRecommendation(taskId);
        showToast(nextStatus === 'done' ? '과제를 완료 처리했습니다.' : '과제 상태를 되돌렸습니다.', 'success');
      } catch (err) {
        showToast('상태 저장 실패', 'error');
      }
    } else {
      showToast(nextStatus === 'done' ? '과제를 완료 처리했습니다.' : '과제 상태를 되돌렸습니다.', 'info');
    }
  };

  const handleSaveNotes = () => {
    localStorage.setItem('daily_meeting_notes', meetingNotes);
    showToast('미팅 및 일일 메모가 저장되었습니다.', 'success');
    setIsMeetingNotesModalOpen(false);
  };

  const getProgress = () => {
    const allTasks = [...tasks.document, ...tasks.checklist, ...tasks.practice];
    const completedCount = allTasks.filter((t) => t.status === 'done').length;
    return { completed: completedCount, total: allTasks.length };
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FontAwesomeIcon icon={faFilePdf} className={styles.iconPdf} />;
      case 'excel':
        return <FontAwesomeIcon icon={faFileExcel} className={styles.iconExcel} />;
      default:
        return <ClipboardList size={16} className={styles.iconDefault} />;
    }
  };

  const { completed, total } = getProgress();
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={styles.container}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>오늘 할 일</h1>
            <p className={styles.subtitle}>오늘 완수해야 할 문서, 체크리스트, 실습 과제를 한눈에 확인하세요.</p>
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
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')} title="AI 어시스턴트">
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className={styles.content}>
          {/* Daily Goals Card */}
          <div className={styles.goalCard}>
            <div className={styles.goalLeft}>
              <div className={styles.goalTitle}>오늘의 온보딩 진척률</div>
              <div className={styles.goalProgress}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}></div>
                </div>
                <span className={styles.progressText}>
                  {completed}/{total} 완료 ({progressPercent}%)
                </span>
              </div>
            </div>
            <div className={styles.goalRight}>
              <button className={styles.goalBtn} onClick={() => setIsDailyGoalsModalOpen(true)}>
                일일 목표 보기
              </button>
              <button className={styles.goalBtn} onClick={() => setIsMeetingNotesModalOpen(true)}>
                📝 미팅 메모 작성
              </button>
            </div>
          </div>

          {/* Task Sections */}
          <div className={styles.taskSections}>
            {/* 1. Documents */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>필수 확인 문서 ({tasks.document.length})</h2>
              </div>
              <div className={styles.taskList}>
                {tasks.document.map((task) => (
                  <div key={task.id} className={styles.taskItem}>
                    <div
                      className={`${styles.checkbox} ${task.status === 'done' ? styles.checked : ''}`}
                      onClick={() => toggleTaskComplete(task.id, 'document')}
                      style={{ cursor: 'pointer' }}
                    >
                      {task.status === 'done' && <Check size={14} />}
                    </div>
                    <div className={styles.taskIcon}>{getFileIcon(task.type)}</div>
                    <div
                      className={styles.taskInfo}
                      onClick={() => {
                        setSelectedTask({ ...task, category: 'document' });
                        setIsTaskActionsModalOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={`${styles.taskName} ${task.status === 'done' ? styles.completedText : ''}`}>
                        {task.name}
                      </div>
                      <div className={styles.taskDesc}>{task.description}</div>
                    </div>
                    <div className={styles.taskTime}>{task.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Checklists */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>오늘의 체크리스트 ({tasks.checklist.length})</h2>
              </div>
              <div className={styles.taskList}>
                {tasks.checklist.map((task) => (
                  <div key={task.id} className={styles.taskItem}>
                    <div
                      className={`${styles.checkbox} ${task.status === 'done' ? styles.checked : ''}`}
                      onClick={() => toggleTaskComplete(task.id, 'checklist')}
                      style={{ cursor: 'pointer' }}
                    >
                      {task.status === 'done' && <Check size={14} />}
                    </div>
                    <div className={styles.taskIcon}>{getFileIcon(task.type)}</div>
                    <div
                      className={styles.taskInfo}
                      onClick={() => {
                        setSelectedTask({ ...task, category: 'checklist' });
                        setIsTaskActionsModalOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={`${styles.taskName} ${task.status === 'done' ? styles.completedText : ''}`}>
                        {task.name}
                      </div>
                      <div className={styles.taskDesc}>{task.description}</div>
                    </div>
                    <div className={styles.taskTime}>{task.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Practice */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>업무 실습 과제 ({tasks.practice.length})</h2>
              </div>
              <div className={styles.taskList}>
                {tasks.practice.map((task) => (
                  <div key={task.id} className={styles.taskItem}>
                    <div
                      className={`${styles.checkbox} ${task.status === 'done' ? styles.checked : ''}`}
                      onClick={() => toggleTaskComplete(task.id, 'practice')}
                      style={{ cursor: 'pointer' }}
                    >
                      {task.status === 'done' && <Check size={14} />}
                    </div>
                    <div className={styles.taskIcon}>{getFileIcon(task.type)}</div>
                    <div
                      className={styles.taskInfo}
                      onClick={() => {
                        setSelectedTask({ ...task, category: 'practice' });
                        setIsTaskActionsModalOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={`${styles.taskName} ${task.status === 'done' ? styles.completedText : ''}`}>
                        {task.name}
                      </div>
                      <div className={styles.taskDesc}>{task.description}</div>
                    </div>
                    <div className={styles.taskTime}>{task.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendation Banner */}
          <div className={styles.aiBanner}>
            <div className={styles.bannerLeft}>
              <Lightbulb size={24} color="#0765FC" />
              <div>
                <div className={styles.bannerTitle}>AI 맞춤 온보딩 추천</div>
                <div className={styles.bannerSubtitle}>인수인계 계획과 업무 속도에 맞춰 AI가 오늘 수행할 최적의 과제를 추천합니다.</div>
              </div>
            </div>
            <button
              className={styles.bannerBtn}
              onClick={() => router.push(`/ai-chat?q=${encodeURIComponent('오늘 할 일에 추가할 온보딩 과제 추천해줘')}`)}
            >
              + AI에게 추가 과제 추천받기
            </button>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. Daily Goals Modal */}
      {isDailyGoalsModalOpen && (
        <Modal
          open
          onClose={() => setIsDailyGoalsModalOpen(false)}
          title="오늘의 온보딩 목표"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDailyGoalsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.modalContent}>
            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
              오늘 완료해야 할 총 <strong>{total}개</strong>의 과제 중 <strong>{completed}개</strong>를 완수했습니다.
            </p>
            <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', marginBottom: '6px' }}>주요 목표:</div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: '1.7' }}>
                <li>행사 운영 가이드 정독 및 프로세스 파악</li>
                <li>신입 사원 필수 그룹웨어 계정 세팅 확인</li>
                <li>예산 작성 샘플 실습 진행</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Meeting Notes Modal */}
      {isMeetingNotesModalOpen && (
        <Modal
          open
          onClose={() => setIsMeetingNotesModalOpen(false)}
          title="일일 업무 및 미팅 메모"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsMeetingNotesModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton onClick={handleSaveNotes}>
                메모 저장
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.modalContent}>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
              오늘 미팅 내용이나 진행 중 발생한 질의사항을 기록해 두세요.
            </p>
            <textarea
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder="예: 10:30 멘토 미팅 - 예산안 승인 프로세스 질의 완료..."
              rows={6}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        </Modal>
      )}

      {/* 3. Task Actions Modal */}
      {isTaskActionsModalOpen && selectedTask && (
        <Modal
          open
          onClose={() => setIsTaskActionsModalOpen(false)}
          title="과제 작업"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTaskActionsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.modalContent}>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>{selectedTask.name}</h4>
            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b' }}>{selectedTask.description}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  toggleTaskComplete(selectedTask.id, selectedTask.category);
                  setIsTaskActionsModalOpen(false);
                }}
                style={{
                  padding: '10px',
                  backgroundColor: '#0765FC',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {selectedTask.status === 'done' ? '진행 중(대기)으로 되돌리기' : '✅ 완료 처리하기'}
              </button>
              <button
                onClick={() => {
                  setIsTaskActionsModalOpen(false);
                  router.push(`/ai-chat?q=${encodeURIComponent(selectedTask.name + ' 관련 질문')}`);
                }}
                style={{
                  padding: '10px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🤖 AI에게 이 과제에 대해 질문하기
              </button>
              <button
                onClick={() => {
                  setIsTaskActionsModalOpen(false);
                  router.push('/30day-plan');
                }}
                style={{
                  padding: '10px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📅 30일 전체 로드맵에서 확인
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}