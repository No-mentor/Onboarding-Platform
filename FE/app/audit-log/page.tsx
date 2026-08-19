'use client';

import React, { useState } from 'react';
import { ChevronDown, RotateCcw, Bell, HelpCircle, Calendar, Download } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import styles from './audit-log.module.css';

type AuditLog = {
  id: string;
  time: string;
  user: string;
  event: string;
  target: string;
  result: string;
  resultColor: string;
};

const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'mock-log-1', time: '2026.08.16 19:42:13', user: '김세원', event: 'DOC_VIEW', target: '[목업] 행사운영가이드.pdf', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-2', time: '2026.08.16 19:41:02', user: '김세원', event: 'DOC_ACCESS_DENIED', target: '[목업] 임원_급여자료.pdf', result: '거부', resultColor: '#985050' },
  { id: 'mock-log-3', time: '2026.08.16 19:38:27', user: '김세원', event: 'CHAT_QUERY', target: '예산안 사용 시점', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-4', time: '2026.08.16 19:30:55', user: '이민수', event: 'PLAN_REGENERATE', target: '김세원 30일 계획', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-5', time: '2026.08.16 18:58:40', user: '최서연', event: 'MEMBER_INVITE', target: 'newhire.mock@example.com', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-6', time: '2026.08.16 18:44:18', user: '박지은', event: 'DOC_VIEW', target: '[목업] 브랜드가이드.pdf', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-7', time: '2026.08.16 18:31:06', user: '정하늘', event: 'CHAT_QUERY', target: '검수 절차 문의', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-8', time: '2026.08.16 18:12:59', user: '이민수', event: 'DOC_ACCESS_DENIED', target: '[목업] 재무결산자료.xlsx', result: '거부', resultColor: '#985050' },
  { id: 'mock-log-9', time: '2026.08.16 17:50:21', user: '김세원', event: 'DOC_VIEW', target: '[목업] 거래처_연락망.xlsx', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-10', time: '2026.08.16 17:32:14', user: '최서연', event: 'MEMBER_INVITE', target: 'marketer.mock@example.com', result: '허용', resultColor: '#287456' },
];

const DEFAULT_START_DATE = '2026-08-10T00:00';
const DEFAULT_END_DATE = '2026-08-16T23:59';

function toDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLogTime(value: string) {
  const [year, month, day, hour, minute, second] = value.split(/[. :]/).map(Number);
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

export default function AuditLogPage() {
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE);
  const [activeRange, setActiveRange] = useState<'today' | '7days' | '30days' | 'custom'>('7days');

  // Modal states
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPermissionAuditOpen, setIsPermissionAuditOpen] = useState(false);
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);

  const eventBgColors: { [key: string]: string } = {
    DOC_VIEW: '#E8F1FF',
    DOC_ACCESS_DENIED: '#F8EEEE',
    CHAT_QUERY: '#E8F1FF',
    PLAN_REGENERATE: '#E8F1FF',
    MEMBER_INVITE: '#E8F1FF',
  };

  const eventColors: { [key: string]: string } = {
    DOC_VIEW: '#0765FC',
    DOC_ACCESS_DENIED: '#985050',
    CHAT_QUERY: '#0765FC',
    PLAN_REGENERATE: '#0765FC',
    MEMBER_INVITE: '#0765FC',
  };

  const filteredLogs = logs.filter((log) => {
    const userMatch = selectedUser === 'all' || log.user === selectedUser;
    const eventMatch = selectedEvent === 'all' || log.event === selectedEvent;
    const logTime = parseLogTime(log.time);
    const dateMatch = logTime >= new Date(startDate).getTime() && logTime <= new Date(endDate).getTime();
    return userMatch && eventMatch && dateMatch;
  });

  const selectQuickRange = (range: 'today' | '7days' | '30days') => {
    const end = new Date(DEFAULT_END_DATE);
    const start = new Date(DEFAULT_END_DATE);
    start.setHours(0, 0, 0, 0);
    if (range === '7days') start.setDate(start.getDate() - 6);
    if (range === '30days') start.setDate(start.getDate() - 29);
    setStartDate(toDateTimeLocal(start));
    setEndDate(toDateTimeLocal(end));
    setActiveRange(range);
  };

  const resetFilters = () => {
    setSelectedUser('all');
    setSelectedEvent('all');
    setStartDate(DEFAULT_START_DATE);
    setEndDate(DEFAULT_END_DATE);
    setActiveRange('7days');
  };

  const queryLogs = () => {
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      showToast('시작 일시는 종료 일시보다 빠르게 설정해 주세요.', 'error');
      return;
    }
    showToast(`${filteredLogs.length}개의 로그를 조회했습니다.`, 'success');
  };

  return (
    <div className={styles.layout}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>감사 로그</h1>
            <p className={styles.subtitle}>시스템 내 주요 이벤트의 기록을 확인하고 관리할 수 있습니다.</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.workspaceBtn}>
              마케팅팀 인수인계
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn}>
              <Bell size={20} />
              <span className={styles.badge}>7</span>
            </button>
            <button className={styles.helpBtn}>
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {/* Filters */}
          <div className={styles.filterCard}>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>행위자</label>
                <select
                  className={styles.filterSelect}
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="all">전체 사용자</option>
                  <option value="김세원">김세원</option>
                  <option value="이민수">이민수</option>
                  <option value="최서연">최서연</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>이벤트</label>
                <select
                  className={styles.filterSelect}
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                >
                  <option value="all">전체 이벤트</option>
                  <option value="DOC_VIEW">문서 조회</option>
                  <option value="DOC_ACCESS_DENIED">문서 접근 거부</option>
                  <option value="CHAT_QUERY">AI 질문</option>
                  <option value="PLAN_REGENERATE">계획 재생성</option>
                  <option value="MEMBER_INVITE">구성원 초대</option>
                </select>
              </div>

              <div className={`${styles.filterGroup} ${styles.dateFilterGroup}`}>
                <div className={styles.dateFilterHeader}>
                  <label className={styles.filterLabel}>기간</label>
                  <div className={styles.quickRanges} aria-label="빠른 기간 선택">
                    <button className={activeRange === 'today' ? styles.quickRangeActive : styles.quickRange} onClick={() => selectQuickRange('today')}>오늘</button>
                    <button className={activeRange === '7days' ? styles.quickRangeActive : styles.quickRange} onClick={() => selectQuickRange('7days')}>최근 7일</button>
                    <button className={activeRange === '30days' ? styles.quickRangeActive : styles.quickRange} onClick={() => selectQuickRange('30days')}>최근 30일</button>
                  </div>
                </div>
                <div className={styles.dateRange}>
                  <label className={styles.dateField}><span>시작</span><Calendar size={16} /><input type="datetime-local" className={styles.dateInput} value={startDate} max={endDate} onChange={(e) => { setStartDate(e.target.value); setActiveRange('custom'); }} /></label>
                  <span className={styles.dateRangeSeparator}>~</span>
                  <label className={styles.dateField}><span>종료</span><Calendar size={16} /><input type="datetime-local" className={styles.dateInput} value={endDate} min={startDate} onChange={(e) => { setEndDate(e.target.value); setActiveRange('custom'); }} /></label>
                </div>
              </div>

              <div className={styles.filterActions}>
                <button className={styles.queryBtn} onClick={queryLogs}>조회</button>
                <button className={styles.resetBtn} onClick={resetFilters}>
                  <RotateCcw size={16} />
                  초기화
                </button>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className={styles.card}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>행위자</th>
                    <th>이벤트</th>
                    <th>대상</th>
                    <th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} onClick={() => {
                      setSelectedLogId(log.id);
                      setIsEventDetailsOpen(true);
                    }} style={{ cursor: 'pointer' }}>
                      <td className={styles.timeCell}>{log.time}</td>
                      <td className={styles.userCell}>{log.user}</td>
                      <td>
                        <span
                          className={styles.eventBadge}
                          style={{
                            backgroundColor: eventBgColors[log.event] || '#E8F1FF',
                            color: eventColors[log.event] || '#0765FC',
                          }}
                        >
                          {getDisplayLabel(log.event)}
                        </span>
                      </td>
                      <td className={styles.targetCell}>{log.target}</td>
                      <td>
                        <span
                          className={styles.resultBadge}
                          style={{ color: log.resultColor }}
                        >
                          {log.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <select className={styles.perPageSelect}>
                <option>10개씩 보기</option>
                <option>20개씩 보기</option>
                <option>50개씩 보기</option>
              </select>

              <span className={styles.pageInfo}>전체 128개 중 1~10개</span>

              <div className={styles.paginationBtns}>
                <button className={styles.pagBtn}>&lt;</button>
                <button className={`${styles.pagBtn} ${styles.pagBtnActive}`}>1</button>
                <button className={styles.pagBtn}>2</button>
                <button className={styles.pagBtn}>3</button>
                <button className={styles.pagBtn}>4</button>
                <button className={styles.pagBtn}>...</button>
                <button className={styles.pagBtn}>13</button>
                <button className={styles.pagBtn}>&gt;</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. Event Details Modal */}
      {isEventDetailsOpen && selectedLogId && (
        <Modal
          open
          onClose={() => setIsEventDetailsOpen(false)}
          title="로그 상세 보기"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsEventDetailsOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          {logs.find(l => l.id === selectedLogId) && (
            <>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>시간</span>
                <span className={styles.detailValue}>{logs.find(l => l.id === selectedLogId)?.time}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>행위자</span>
                <span className={styles.detailValue}>
                  {logs.find(l => l.id === selectedLogId)?.user}
                  <span className={styles.badge}>신입 구성원 · 마케팅팀</span>
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>이벤트</span>
                <span
                  className={styles.eventBadge}
                  style={{
                    backgroundColor: eventBgColors[logs.find(l => l.id === selectedLogId)?.event ?? ''] || '#E8F1FF',
                    color: eventColors[logs.find(l => l.id === selectedLogId)?.event ?? ''] || '#0765FC',
                  }}
                >
                  {getDisplayLabel(logs.find(l => l.id === selectedLogId)?.event)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>대상</span>
                <span className={styles.detailValue}>{logs.find(l => l.id === selectedLogId)?.target}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>결과</span>
                <span
                  className={styles.resultBadge}
                  style={{ color: logs.find(l => l.id === selectedLogId)?.resultColor }}
                >
                  {logs.find(l => l.id === selectedLogId)?.result}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>워크스페이스</span>
                <span className={styles.detailValue}>마케팅팀 인수인계</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>접속 주소</span>
                <span className={styles.detailValue}>203.254.11.27</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>설명</span>
                <span className={styles.detailValue}>액택 운송에 대한 접근 권한이 없어 액세스가 거부되었습니다.</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>관련 메타데이터</span>
                <div className={styles.metadata}>
                  <code>{JSON.stringify({
                    "object_type": "document",
                    "object_id": "doc_8f7a2c1b",
                    "file_name": "[목업] 임원_급여자료.pdf",
                    "file_size": 2847291,
                    "owner": "admin@company.com",
                    "permission_required": "viewer"
                  }, null, 2)}</code>
                </div>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* 2. Export Modal */}
      {isExportModalOpen && (
        <Modal
          open
          onClose={() => setIsExportModalOpen(false)}
          title="로그 내보내기"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsExportModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('audit-log-0')}
                onClick={() => run('audit-log-0', '로그를 내보냈습니다.', () => setIsExportModalOpen(false))}
              >
                <Download size={16} /> 내보내기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>파일 형식</label>
            <div className={styles.formatOptions}>
              <label className={styles.radioOption}>
                <input type="radio" name="format" value="csv" defaultChecked />
                <span>표 형식 파일</span>
              </label>
              <label className={styles.radioOption}>
                <input type="radio" name="format" value="excel" />
                <span>엑셀 파일</span>
              </label>
              <label className={styles.radioOption}>
                <input type="radio" name="format" value="json" />
                <span>데이터 파일</span>
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>포함 범위</label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input type="checkbox" defaultChecked />
                <span>기본 정보</span>
              </label>
              <label className={styles.checkbox}>
                <input type="checkbox" defaultChecked />
                <span>상세 정보</span>
              </label>
              <label className={styles.checkbox}>
                <input type="checkbox" />
                <span>메타데이터</span>
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Permission Audit Modal */}
      {isPermissionAuditOpen && (
        <Modal
          open
          onClose={() => setIsPermissionAuditOpen(false)}
          title="권한 감사"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsPermissionAuditOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.permissionItem}>
            <div className={styles.permissionHeader}>
              <h3>문서 접근 권한</h3>
            </div>
            <div className={styles.permissionContent}>
              <div className={styles.permissionRow}>
                <span className={styles.permissionLabel}>역할</span>
                <span className={styles.permissionValue}>신입 구성원</span>
              </div>
              <div className={styles.permissionRow}>
                <span className={styles.permissionLabel}>권한</span>
                <span className={styles.permissionValue}>조회, 다운로드</span>
              </div>
              <div className={styles.permissionRow}>
                <span className={styles.permissionLabel}>생성 일시</span>
                <span className={styles.permissionValue}>2026.08.16 18:21:01</span>
              </div>
            </div>
          </div>

          <div className={styles.permissionItem}>
            <div className={styles.permissionHeader}>
              <h3>AI 질문 권한</h3>
            </div>
            <div className={styles.permissionContent}>
              <div className={styles.permissionRow}>
                <span className={styles.permissionLabel}>역할</span>
                <span className={styles.permissionValue}>구성원</span>
              </div>
              <div className={styles.permissionRow}>
                <span className={styles.permissionLabel}>권한</span>
                <span className={styles.permissionValue}>질문</span>
              </div>
              <div className={styles.permissionRow}>
                <span className={styles.permissionLabel}>생성 일시</span>
                <span className={styles.permissionValue}>2026.08.16 18:21:01</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Time Range Picker Modal */}
      {isTimeRangeOpen && (
        <Modal
          open
          onClose={() => setIsTimeRangeOpen(false)}
          title="시간 범위 선택"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTimeRangeOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('audit-log-1')}
                onClick={() => run('audit-log-1', '필터를 적용했습니다.', () => setIsTimeRangeOpen(false))}
              >
                적용
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.calendarGrid}>
            <div className={styles.calendar}>
              <div className={styles.calendarHeader}>
                <button>&laquo;</button>
                <span>2026년 8월</span>
                <button>&raquo;</button>
              </div>
              <div className={styles.calendarBody}>
                <div className={styles.dayHeader}>
                  <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
                </div>
                <div className={styles.dayGrid}>
                  {[26, 27, 28, 29, 30, 31, 1].map((d, i) => (
                    <button key={`prev-${i}`} className={styles.dayBtn} style={{ color: '#9CA3AF' }}>{d}</button>
                  ))}
                  {[...Array(31)].map((_, i) => (
                    <button
                      key={`curr-${i + 1}`}
                      className={`${styles.dayBtn} ${[10, 16].includes(i + 1) ? styles.active : ''}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  {[1, 2, 3, 4, 5].map((d, i) => (
                    <button key={`next-${i}`} className={styles.dayBtn} style={{ color: '#9CA3AF' }}>{d}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.calendar}>
              <div className={styles.calendarHeader}>
                <button>&laquo;</button>
                <span>2026년 8월</span>
                <button>&raquo;</button>
              </div>
              <div className={styles.calendarBody}>
                <div className={styles.dayHeader}>
                  <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
                </div>
                <div className={styles.dayGrid}>
                  {[26, 27, 28, 29, 30, 31, 1].map((d, i) => (
                    <button key={`prev2-${i}`} className={styles.dayBtn} style={{ color: '#9CA3AF' }}>{d}</button>
                  ))}
                  {[...Array(31)].map((_, i) => (
                    <button
                      key={`curr2-${i + 1}`}
                      className={`${styles.dayBtn} ${[16].includes(i + 1) ? styles.active : ''}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  {[1, 2, 3, 4, 5].map((d, i) => (
                    <button key={`next2-${i}`} className={styles.dayBtn} style={{ color: '#9CA3AF' }}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.timeRangePresets}>
            <button className={styles.presetBtn}>오늘</button>
            <button className={styles.presetBtn}>최근 7일</button>
            <button className={styles.presetBtn}>최근 30일</button>
            <button className={styles.presetBtn}>직접 선택</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
