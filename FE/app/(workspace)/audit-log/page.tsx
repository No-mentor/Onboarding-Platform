'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, RotateCcw, Bell, HelpCircle, Calendar, Download, Copy } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import { getAuditLogs, type AuditLogResponse } from '@/lib/api';
import styles from './audit-log.module.css';

export default function AuditLogPage() {
  const router = useRouter();
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  // Modal states
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPermissionAuditOpen, setIsPermissionAuditOpen] = useState(false);
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);

  // Load audit logs on mount
  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const response = await getAuditLogs();
      setLogs(response.items ?? []);
    } catch (err) {
      console.error('감사 로그 로드 실패:', err);
      showToast('감사 로그를 불러올 수 없습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleExportLogs = () => {
    if (filteredLogs.length === 0) {
      showToast('내보낼 감사 로그가 없습니다.', 'error');
      return;
    }
    let content = '';
    let filename = `audit_logs_${new Date().toISOString().slice(0, 10)}`;
    let mimeType = 'text/plain';

    if (exportFormat === 'json') {
      content = JSON.stringify(filteredLogs, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    } else {
      const headers = ['ID', '이벤트', '행위자 ID', '결과', '발생시간'];
      const rows = filteredLogs.map((l) => [
        `"${l.id}"`,
        `"${l.eventType}"`,
        `"${l.actorId || 'SYSTEM'}"`,
        `"${l.result || ''}"`,
        `"${l.createdAt || ''}"`
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      filename += '.csv';
      mimeType = 'text/csv;charset=utf-8;';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${filename} 파일을 성공적으로 내보냈습니다.`, 'success');
    setIsExportModalOpen(false);
  };

  /** 서버는 ISO 문자열로 내려준다 */
  const formatLogTime = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

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

  const distinctActors = Array.from(new Set(logs.map((l) => l.actorId).filter(Boolean))) as string[];
  const distinctEvents = Array.from(new Set(logs.map((l) => l.eventType).filter(Boolean))) as string[];

  const filteredLogs = logs.filter((log) => {
    const userMatch = selectedUser === 'all' || log.actorId === selectedUser;
    const eventMatch = selectedEvent === 'all' || log.eventType === selectedEvent;
    return userMatch && eventMatch;
  });

  const selectedLog = logs.find((l) => l.id === selectedLogId);

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
            <button className={styles.workspaceBtn} onClick={() => router.push('/workspace-selection')}>
              워크스페이스 전환
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')}>
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
                  <option value="all">전체 행위자 ({distinctActors.length})</option>
                  {distinctActors.map((actor) => (
                    <option key={actor} value={actor}>{actor}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>이벤트 유형</label>
                <select
                  className={styles.filterSelect}
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                >
                  <option value="all">전체 이벤트 ({distinctEvents.length})</option>
                  {distinctEvents.map((evt) => (
                    <option key={evt} value={evt}>{evt}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>필터 작업</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setSelectedUser('all');
                      setSelectedEvent('all');
                      loadLogs();
                      showToast('필터를 초기화했습니다.', 'info');
                    }}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#F3F4F6',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RotateCcw size={14} /> 새로고침
                  </button>
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#4F46E5',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Download size={14} /> 로그 내보내기
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>행위자</th>
                    <th>이벤트</th>
                    <th>대상 리소스</th>
                    <th>결과</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                        감사 로그를 불러오는 중입니다...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                        조건에 맞는 감사 로그가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td className={styles.dateCell}>{formatLogTime(log.createdAt)}</td>
                        <td>
                          <div className={styles.userCell}>
                            <span className={styles.userName}>{log.actorId ?? 'SYSTEM'}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={styles.eventBadge}
                            style={{
                              backgroundColor: eventBgColors[log.eventType] || '#EDE9FE',
                              color: eventColors[log.eventType] || '#6C46A2',
                            }}
                          >
                            {log.eventType}
                          </span>
                        </td>
                        <td className={styles.targetCell}>
                          {[log.resourceType, log.resourceId].filter(Boolean).join(' · ') || '-'}
                        </td>
                        <td>
                          <span
                            className={styles.resultBadge}
                            style={{
                              color: log.result === 'DENY' ? '#ef4444' : '#10B981',
                            }}
                          >
                            {log.result}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.detailBtn}
                            onClick={() => {
                              setSelectedLogId(log.id);
                              setIsEventDetailsOpen(true);
                            }}
                          >
                            상세 보기
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / Summary */}
            <div className={styles.pagination}>
              <span className={styles.pagInfo}>
                총 {filteredLogs.length}건의 감사 이벤트 기록
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. Event Details Modal */}
      {isEventDetailsOpen && selectedLog && (
        <Modal
          open
          onClose={() => setIsEventDetailsOpen(false)}
          title="감사 로그 상세 정보"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsEventDetailsOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>이벤트 ID</span>
            <span className={styles.detailValue} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{selectedLog.id}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>발생 시간</span>
            <span className={styles.detailValue}>{formatLogTime(selectedLog.createdAt)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>행위자</span>
            <span className={styles.detailValue}>{selectedLog.actorId ?? 'SYSTEM'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>이벤트 유형</span>
            <span
              className={styles.eventBadge}
              style={{
                backgroundColor: eventBgColors[selectedLog.eventType] || '#EDE9FE',
                color: eventColors[selectedLog.eventType] || '#6C46A2',
              }}
            >
              {selectedLog.eventType}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>대상 리소스</span>
            <span className={styles.detailValue}>
              {[selectedLog.resourceType, selectedLog.resourceId].filter(Boolean).join(' · ') || '-'}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>처리 결과</span>
            <span
              className={styles.resultBadge}
              style={{
                color: selectedLog.result === 'DENY' ? '#ef4444' : '#10B981',
                fontWeight: 600,
              }}
            >
              {selectedLog.result}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>메타데이터</span>
            <div className={styles.metadata} style={{ width: '100%', marginTop: '8px' }}>
              <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {selectedLog.metadata ? JSON.stringify(selectedLog.metadata, null, 2) : '기록된 추가 메타데이터가 없습니다.'}
              </pre>
            </div>
          </div>
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
                onClick={handleExportLogs}
              >
                <Download size={16} /> 내보내기 ({filteredLogs.length}건)
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>파일 형식</label>
            <div className={styles.formatOptions}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                />
                <span>CSV (스프레드시트 호환)</span>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={() => setExportFormat('json')}
                />
                <span>JSON (원시 데이터)</span>
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
