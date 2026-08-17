'use client';

import React, { useState } from 'react';
import { ChevronRight, Lightbulb, Bell, HelpCircle, Zap, ClipboardList } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import styles from './daily-tasks.module.css';

export default function DailyTasksPage() {
  const [tasks, setTasks] = useState({
    document: [
      { id: 1, name: '행사운영가이드.pdf 읽기', type: 'pdf', status: 'done', time: '10:30 까지', description: '추천 이유: 오늘 진행 필요', category: 'document' },
      { id: 2, name: '예산안_v7.xlsx 검토', type: 'excel', status: 'pending', time: '14:00 까지', description: '예상 소요: 20 분', category: 'document' },
    ],
    checklist: [
      { id: 3, name: '신입 계정 권한 확인', type: 'checklist', status: 'in_progress', time: '14:00 까지', description: '추천 이유: 오늘 진행 필요', category: 'checklist' },
      { id: 4, name: '주간회의 자료 준비', type: 'checklist', status: 'pending', time: '16:00 까지', description: '예상 소요: 20 분', category: 'checklist' },
    ],
    practice: [
      { id: 5, name: '예산 생성 업데이트', type: 'practice', status: 'pending', time: '16:00 까지', description: '추천 이유: 오늘 진행 필요', category: 'practice' },
      { id: 6, name: '거래처 정보 확인하기', type: 'practice', status: 'pending', time: '17:00 까지', description: '예상 소요: 20 분', category: 'practice' },
    ],
  });

  const toggleTaskComplete = (taskId: number, category: 'document' | 'checklist' | 'practice') => {
    setTasks((prevTasks) => ({
      ...prevTasks,
      [category]: prevTasks[category].map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === 'done' ? 'pending' : 'done' }
          : task
      ),
    }));
  };

  const getProgress = () => {
    const allTasks = [...tasks.document, ...tasks.checklist, ...tasks.practice];
    const completedCount = allTasks.filter(t => t.status === 'done').length;
    return { completed: completedCount, total: allTasks.length };
  };

  const getStatusInfo = () => {
    const allTasks = [...tasks.document, ...tasks.checklist, ...tasks.practice];
    return {
      done: allTasks.filter(t => t.status === 'done').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      skipped: allTasks.filter(t => t.status === 'skipped').length,
    };
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

  const getStatusBadgeText = (status: string) => {
    switch (status) {
      case 'done':
        return '완료';
      case 'in_progress':
        return '진행 중';
      case 'pending':
        return '대기';
      case 'skipped':
        return '건너뜨림';
      default:
        return '대기';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'done':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'pending':
        return '#F59E0B';
      case 'skipped':
        return '#9CA3AF';
      default:
        return '#9CA3AF';
    }
  };

  const progress = getProgress();
  const statusInfo = getStatusInfo();
  const progressPercentage = (progress.completed / progress.total) * 100;

  const renderTaskSection = (title: string, icon: string, category: 'document' | 'checklist' | 'practice', items?: any[]) => (
    <div className={styles.taskSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </div>

      <div className={styles.tasksList}>
        {items && items.length > 0 ? items.map((task) => (
          <div key={task.id} className={styles.taskCard}>
            <div className={styles.taskHeader}>
              <div className={styles.taskNameArea}>
                <div className={styles.taskIcon}>
                  {task.type === 'document' || task.type === 'pdf' || task.type === 'excel'
                    ? getFileIcon(task.type === 'document' ? 'pdf' : task.type)
                    : <ClipboardList size={16} className={styles.iconDefault} />}
                </div>
                <span className={styles.taskName}>{task.name}</span>
                <span
                  className={styles.statusBadge}
                  style={{ color: getStatusBadgeColor(task.status) }}
                >
                  {getStatusBadgeText(task.status)}
                </span>
              </div>
              <span className={styles.taskTime}>{task.time}</span>
            </div>
            <div className={styles.taskDescription}>{task.description}</div>
            <button
              className={styles.actionBtn}
              onClick={() => toggleTaskComplete(task.id, category)}
            >
              {task.status === 'done' ? '미완료' : '완료'}
            </button>
          </div>
        )) : <div style={{ padding: '16px', color: '#9CA3AF', textAlign: 'center' }}>항목이 없습니다</div>}

        <button className={styles.addMoreBtn}>+ 항목 추천 받기</button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.greeting}>안녕하세요, 김세원님</h1>
            <p className={styles.description}>AI 가 30 일 계획과 현재 진행 상황을 바탕으로 오늘 해야 할 일을 추천합니다.</p>
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
          {/* Progress Card */}
          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <h2 className={styles.progressTitle}>오늘의 진행</h2>
              <div className={styles.statusBadges}>
                <div className={styles.badge} style={{ color: '#10B981' }}>완료 {statusInfo.done}</div>
                <div className={styles.badge} style={{ color: '#3B82F6' }}>진행 {statusInfo.inProgress}</div>
                <div className={styles.badge} style={{ color: '#F59E0B' }}>대기 {statusInfo.pending}</div>
                <div className={styles.badge} style={{ color: '#9CA3AF' }}>건너뜀 {statusInfo.skipped}</div>
              </div>
            </div>
            <div className={styles.progressContainer}>
              <div className={styles.progressLabel}>{progress.completed} / {progress.total} 완료</div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Task Sections Grid */}
          <div className={styles.sectionsGrid}>
            {renderTaskSection('문서 읽기', '', 'document', tasks.document)}
            {renderTaskSection('체크리스트', '', 'checklist', tasks.checklist)}
            {renderTaskSection('실습 / 업무', '', 'practice', tasks.practice)}
          </div>

          {/* Recommendation Info */}
          <div className={styles.recommendationCard}>
            <div className={styles.recommendationHeader}>
              <Lightbulb size={20} />
              <h3 className={styles.recommendationTitle}>추천 기준</h3>
            </div>
            <p className={styles.recommendationText}>
              우선순위, 마감 시간, 현재 진행 상황, 팀 목표 출업적으로 고려합니다.
            </p>
            <button className={styles.moreInfoLink}>
              추천 기준 자세히 보기 <ChevronRight size={16} />
            </button>
          </div>

          {/* Dismissible Note */}
          <div className={styles.dismissNote}>
            추천 항목은 언제든 dismiss (건너뛰기) 할 수 있습니다.
          </div>

          {/* AI Question Button */}
          <button className={styles.aiQuestionBtn}>
            <Zap size={16} /> AI에게 질문하기
          </button>
        </div>
      </main>
    </div>
  );
}
