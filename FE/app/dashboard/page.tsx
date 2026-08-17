'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Bell, HelpCircle } from 'lucide-react';
import { AiOutlineFilePdf, AiOutlineFileExcel, AiOutlineFile } from 'react-icons/ai';
import { CommonSidebar } from '@/components/common-sidebar';
import { DailyTasksModal } from '@/components/dashboard/modals/daily-tasks-modal';
import { AllFilesModal } from '@/components/dashboard/modals/all-files-modal';
import { NotificationsPanel } from '@/components/dashboard/panels/notifications-panel';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const [showDailyTasksModal, setShowDailyTasksModal] = useState(false);
  const [showAllFilesModal, setShowAllFilesModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const todayTasks = [
    {
      id: 1,
      label: '문서',
      title: '행사운영가이드 .pdf 읽기',
      time: '10:30 가치',
    },
    {
      id: 2,
      label: '체크',
      title: '거래처 연락망 확인하기',
      time: '14:00 가치',
    },
    {
      id: 3,
      label: '실습',
      title: '예산안 설물 업데이트',
      time: '16:00 가치',
    },
  ];

  const recentFiles = [
    {
      id: 1,
      name: '행사운영가이드 .pdf',
      size: '5.8MB',
      format: 'PDF',
      status: 'READY',
      type: 'pdf',
    },
    {
      id: 2,
      name: '행사_예산안_v7.xlsx',
      size: '2.4MB',
      format: 'XLSX',
      status: 'READY',
      type: 'excel',
    },
    {
      id: 3,
      name: '거래처_연락망.xlsx',
      size: '1.6MB',
      format: 'XLSX',
      status: 'READY',
      type: 'excel',
    },
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <AiOutlineFilePdf className={styles.fileTypeIcon} style={{ color: '#D1495A' }} />;
      case 'excel':
        return <AiOutlineFileExcel className={styles.fileTypeIcon} style={{ color: '#207245' }} />;
      default:
        return <AiOutlineFile className={styles.fileTypeIcon} />;
    }
  };

  return (
    <div className={styles.layout}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.greeting}>안녕하세요, 김세원님</h1>
          <div className={styles.headerRight}>
            <button className={styles.workspaceBtn}>
              마케팅팀 인수인계
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={20} />
              <span className={styles.badge}>7</span>
            </button>
            <button className={styles.helpBtn}>
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Content Grid */}
        <div className={styles.contentGrid}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            {/* Today's Tasks */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>오늘 할 일</h2>
                <span className={styles.count}>3개</span>
              </div>
              <div className={styles.tasksList}>
                {todayTasks.map((task) => (
                  <div key={task.id} className={styles.taskItem}>
                    <span className={`${styles.taskLabel} ${styles[`label_${task.label}`]}`}>{task.label}</span>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <span className={styles.taskTime}>{task.time}</span>
                  </div>
                ))}
              </div>
              <button className={styles.viewAllBtn} onClick={() => setShowDailyTasksModal(true)}>
                오늘 할 일 전체 보기
                <ChevronRight size={16} />
              </button>
            </section>

            {/* Recent Files */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>최근 업무 파일</h2>
                <button className={styles.viewAllLink} onClick={() => setShowAllFilesModal(true)}>
                  전체 파일 보기
                </button>
              </div>
              <div className={styles.filesGrid}>
                {recentFiles.map((file) => (
                  <div key={file.id} className={styles.fileCard}>
                    <div className={styles.fileIcon}>{getFileIcon(file.type)}</div>
                    <div className={styles.fileDetails}>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileSize}>{file.format} · {file.size}</div>
                      <span className={styles.fileStatus}>{file.status}</span>
                    </div>
                    <button className={styles.aiBtn}>
                      AI에게 질문
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className={styles.rightColumn}>
            {/* Progress Card */}
            <section className={styles.card}>
              <div className={styles.progressHeader}>
                <h2 className={styles.cardTitle}>인수인계 진행</h2>
                <span className={styles.bottleneck}>병목 2건</span>
              </div>
              <div className={styles.progressNumber}>32%</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill}></div>
              </div>
              <div className={styles.progressStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>완료</span>
                  <span className={styles.statValue}>14</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>진행</span>
                  <span className={styles.statValue}>18</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>대기</span>
                  <span className={styles.statValue}>13</span>
                </div>
              </div>
            </section>

            {/* Quick Question */}
            <section className={styles.aiPanel}>
              <div className={styles.aiHeader}>
                빠른 질문
              </div>
              <p className={styles.aiDescription}>업무 파일을 바탕으로 바로 물어보세요.</p>
              <input
                type="text"
                placeholder='"이 예산은 언제 사용해?"'
                className={styles.aiInput}
              />
              <button className={styles.aiSubmitBtn}>
                AI에게 질문하기
              </button>
            </section>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showDailyTasksModal && (
        <DailyTasksModal onClose={() => setShowDailyTasksModal(false)} />
      )}
      {showAllFilesModal && (
        <AllFilesModal onClose={() => setShowAllFilesModal(false)} />
      )}
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
}
