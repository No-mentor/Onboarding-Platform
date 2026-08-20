'use client';

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { completeRecommendation, type DashboardRecommendation } from '@/lib/api';
import { getDisplayLabel } from '@/lib/display-labels';
import styles from './daily-tasks-modal.module.css';

interface DailyTasksModalProps {
  onClose: () => void;
  tasks: DashboardRecommendation[];
  /** 완료 처리 후 대시보드가 최신 값을 다시 받도록 알린다 */
  onCompleted: () => void | Promise<void>;
  onShowDetail: (task: DashboardRecommendation) => void;
}

/** 서버 PlanItemType 을 화면 분류 탭으로 옮긴다 */
const TABS = [
  { id: 'ALL', label: '전체' },
  { id: 'DOCUMENT', label: '문서' },
  { id: 'CHECKLIST', label: '체크리스트' },
  { id: 'PRACTICE', label: '실습' },
  { id: 'PERSON', label: '사람' },
];

export function DailyTasksModal({ onClose, tasks, onCompleted, onShowDetail }: DailyTasksModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('ALL');
  const [completingId, setCompletingId] = useState<string | null>(null);

  const visibleTasks = useMemo(
    () => (activeTab === 'ALL' ? tasks : tasks.filter(t => t.type === activeTab)),
    [tasks, activeTab]
  );

  const categoryClass = (type: string) => {
    if (type === 'DOCUMENT') return styles.catDocument;
    if (type === 'CHECKLIST') return styles.catChecklist;
    return styles.catPractice;
  };

  const handleComplete = async (task: DashboardRecommendation) => {
    setCompletingId(task.id);
    try {
      await completeRecommendation(task.id);
      showToast('완료 처리했습니다.', 'success');
      await onCompleted();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '완료 처리에 실패했습니다.', 'error');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <Modal open onClose={onClose} title="오늘 할 일 전체 보기" size="lg">
      <div className={styles.tabsContainer}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tasksList}>
        {visibleTasks.length > 0 ? (
          visibleTasks.map(task => {
            const isDone = task.status === 'DONE';
            return (
              <div key={task.id} className={styles.taskRow}>
                <div className={`${styles.taskCategory} ${categoryClass(task.type)}`}>
                  {getDisplayLabel(task.type)}
                </div>
                <div className={styles.taskContent}>
                  <h3 className={styles.taskTitle}>{task.title}</h3>
                  <p className={styles.taskDesc}>
                    {task.source || (task.personName ? `담당 ${task.personName}` : '출처 정보 없음')}
                  </p>
                </div>
                <div className={styles.taskTime}>
                  {isDone ? '완료' : `우선순위 ${task.priority}`}
                </div>
                <div className={styles.taskActions}>
                  <button className={styles.actionBtnSecondary} onClick={() => onShowDetail(task)}>
                    상세 보기
                  </button>
                  <button
                    className={styles.actionBtnPrimary}
                    onClick={() => void handleComplete(task)}
                    disabled={isDone || completingId === task.id}
                  >
                    {isDone ? '완료됨' : completingId === task.id ? '처리 중...' : '완료'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.empty}>해당 조건의 할 일이 없습니다.</div>
        )}
      </div>

      <div className={styles.note}>작업을 완료하면 진행률이 자동으로 업데이트됩니다.</div>
    </Modal>
  );
}
