'use client';

import React, { useState } from 'react';
import { ChevronDown, RotateCcw, Bell, HelpCircle, Calendar, Download, Copy } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import styles from './audit-log.module.css';

export default function AuditLogPage() {
  const { run, isPending } = useModalAction();
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [startDate, setStartDate] = useState('2026.08.10 09:00');
  const [endDate, setEndDate] = useState('2026.08.16 18:16');

  // Modal states
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPermissionAuditOpen, setIsPermissionAuditOpen] = useState(false);
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  const logs = [
    {
      id: 1,
      time: '2026.08.16 19:42:13',
      user: '김세원',
      event: 'DOC_VIEW',
      target: '행사운영가이드.pdf',
      result: 'ALLOW',
      resultColor: '#10B981',
    },
    {
      id: 2,
      time: '2026.08.16 19:41:02',
      user: '김세원',
      event: 'DOC_ACCESS_DENIED',
      target: '임원_급여자료.pdf',
      result: 'DENY',
      resultColor: '#DC2626',
    },
    {
      id: 3,
      time: '2026.08.16 19:38:27',
      user: '김세원',
      event: 'CHAT_QUERY',
      target: '예산안 사용 사진',
      result: 'ALLOW',
      resultColor: '#10B981',
    },
    {
      id: 4,
      time: '2026.08.16 19:30:55',
      user: '이민수',
      event: 'PLAN_REGENERATE',
      target: '김세원 30일 계획',
      result: 'ALLOW',
      resultColor: '#10B981',
    },
    {
      id: 5,
      time: '2026.08.16 18:58:40',
      user: '최서연',
      event: 'MEMBER_INVITE',
      target: 'newhire@company.com',
      result: 'ALLOW',
      resultColor: '#10B981',
    },
  ];

  const eventBgColors: { [key: string]: string } = {
    DOC_VIEW: '#EDE9FE',
    DOC_ACCESS_DENIED: '#FEE2E2',
    CHAT_QUERY: '#EDE9FE',
    PLAN_REGENERATE: '#EDE9FE',
    MEMBER_INVITE: '#EDE9FE',
  };

  const eventColors: { [key: string]: string } = {
    DOC_VIEW: '#A78BFA',
    DOC_ACCESS_DENIED: '#EF4444',
    CHAT_QUERY: '#A78BFA',
    PLAN_REGENERATE: '#A78BFA',
    MEMBER_INVITE: '#A78BFA',
  };

  const filteredLogs = logs.filter((log) => {
    const userMatch = selectedUser === 'all' || log.user === selectedUser;
    const eventMatch = selectedEvent === 'all' || log.event === selectedEvent;
    return userMatch && eventMatch;
  });

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
                <label className={styles.filterLabel}>영위자</label>
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
                  <option value="DOC_VIEW">DOC_VIEW</option>
                  <option value="DOC_ACCESS_DENIED">DOC_ACCESS_DENIED</option>
                  <option value="CHAT_QUERY">CHAT_QUERY</option>
                  <option value="PLAN_REGENERATE">PLAN_REGENERATE</option>
                  <option value="MEMBER_INVITE">MEMBER_INVITE</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>기간</label>
                <div className={styles.dateRange}>
                  <input
                    type="text"
                    className={styles.dateInput}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className={styles.dateRangeSeparator}>~</span>
                  <input
                    type="text"
                    className={styles.dateInput}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.filterActions}>
                <button className={styles.queryBtn}>조회</button>
                <button className={styles.resetBtn}>
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
                            backgroundColor: eventBgColors[log.event] || '#EDE9FE',
                            color: eventColors[log.event] || '#A78BFA',
                          }}
                        >
                          {log.event}
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

              <span className={styles.pageInfo}>1-10 of 128</span>

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
                  <span className={styles.badge}>NEW_HIRE · 마케팅팀</span>
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>이벤트</span>
                <span
                  className={styles.eventBadge}
                  style={{
                    backgroundColor: eventBgColors[logs.find(l => l.id === selectedLogId)?.event!] || '#EDE9FE',
                    color: eventColors[logs.find(l => l.id === selectedLogId)?.event!] || '#A78BFA',
                  }}
                >
                  {logs.find(l => l.id === selectedLogId)?.event}
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
                <span className={styles.detailLabel}>IP 주소</span>
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
                    "file_name": "임원_급여자료.pdf",
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
                <span>CSV</span>
              </label>
              <label className={styles.radioOption}>
                <input type="radio" name="format" value="excel" />
                <span>Excel</span>
              </label>
              <label className={styles.radioOption}>
                <input type="radio" name="format" value="json" />
                <span>JSON</span>
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
                <span className={styles.permissionValue}>NEW_HIRE</span>
              </div>
              <div className={styles.permissionRow}>
                <span className={styles.permissionLabel}>권한</span>
                <span className={styles.permissionValue}>VIEW, DOWNLOAD</span>
              </div>
              <div className={styles.permissionRow}>
                <span className={styles.permissionLabel}>생성 일시</span>
                <span className={styles.permissionValue}>2026.08.16 18:21:01</span>
              </div>
            </div>
          </div>

          <div className={styles.permissionItem}>
            <div className={styles.permissionHeader}>
              <h3>AI 쿼리 권한</h3>
            </div>
            <div className={styles.permissionContent}>
              <div className={styles.permissionRow}>
                <span className={styles.permissionLabel}>역할</span>
                <span className={styles.permissionValue}>MEMBER</span>
              </div>
              <div className={styles.permissionRow}>
                <span className={styles.permissionLabel}>권한</span>
                <span className={styles.permissionValue}>QUERY</span>
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
