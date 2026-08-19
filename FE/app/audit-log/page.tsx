'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, RotateCcw, Bell, HelpCircle, Calendar, Download, RefreshCw } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import { getAuditLogs, AuditLogResponse } from '@/lib/api';
import styles from './audit-log.module.css';

type AuditLog = {
  id: string;
  time: string;
  user: string;
  event: string;
  target: string;
  result: string;
  resultColor: string;
  metadata?: Record<string, unknown> | null;
};

const DEFAULT_MOCK_LOGS: AuditLog[] = [
  { id: 'mock-log-1', time: '2026.08.16 19:42:13', user: '김세원', event: 'DOC_VIEW', target: '[온보딩] 행사운영가이드.pdf', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-2', time: '2026.08.16 19:41:02', user: '김세원', event: 'DOC_ACCESS_DENIED', target: '[보안] 임원_급여자료.pdf', result: '거부', resultColor: '#985050' },
  { id: 'mock-log-3', time: '2026.08.16 19:38:27', user: '김세원', event: 'CHAT_QUERY', target: '예산안 사용 시점 질의', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-4', time: '2026.08.16 19:30:55', user: '이민수', event: 'PLAN_REGENERATE', target: '김세원 30일 계획', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-5', time: '2026.08.16 18:58:40', user: '최서연', event: 'MEMBER_INVITE', target: 'newhire.mock@example.com', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-6', time: '2026.08.16 18:44:18', user: '박지은', event: 'DOC_VIEW', target: '[온보딩] 브랜드가이드.pdf', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-7', time: '2026.08.16 18:31:06', user: '정하늘', event: 'CHAT_QUERY', target: '검수 절차 문의', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-8', time: '2026.08.16 18:12:59', user: '이민수', event: 'DOC_ACCESS_DENIED', target: '[기밀] 재무결산자료.xlsx', result: '거부', resultColor: '#985050' },
  { id: 'mock-log-9', time: '2026.08.16 17:50:21', user: '김세원', event: 'DOC_VIEW', target: '[온보딩] 거래처_연락망.xlsx', result: '허용', resultColor: '#287456' },
  { id: 'mock-log-10', time: '2026.08.16 17:32:14', user: '최서연', event: 'MEMBER_INVITE', target: 'marketer.mock@example.com', result: '허용', resultColor: '#287456' },
];

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [logs, setLogs] = useState<AuditLog[]>(DEFAULT_MOCK_LOGS);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await getAuditLogs(0, 100);
      if (res && res.content && res.content.length > 0) {
        const mapped: AuditLog[] = res.content.map((item: AuditLogResponse, idx: number) => {
          const rawTime = item.createdAt || item.timestamp;
          const dateStr = rawTime ? new Date(rawTime).toLocaleString('ko-KR') : '2026.08.16 19:42:13';
          const isSuccess = String(item.result) === 'ALLOW' || String(item.result) === 'SUCCESS' || String(item.result) === '허용';
          const targetName = (item.metadata?.documentTitle as string) || (item.metadata?.query as string) || item.targetName || item.resourceType || '작업 대상';
          return {
            id: item.id || `audit-log-${idx + 1}`,
            time: dateStr,
            user: item.actorName || item.actorId || '시스템 / 관리자',
            event: item.eventType || 'DOC_VIEW',
            target: targetName,
            result: isSuccess ? '허용' : '거부',
            resultColor: isSuccess ? '#287456' : '#985050',
            metadata: item.metadata,
          };
        });
        setLogs(mapped);
      }
    } catch (err) {
      console.log('실제 감사 로그 조회 실패 (모의 데이터 유지):', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const eventBgColors: Record<string, string> = {
    DOC_VIEW: '#E8F1FF',
    DOC_ACCESS_DENIED: '#F8EEEE',
    CHAT_QUERY: '#E8F1FF',
    PLAN_REGENERATE: '#E8F1FF',
    MEMBER_INVITE: '#E8F1FF',
  };

  const eventColors: Record<string, string> = {
    DOC_VIEW: '#0765FC',
    DOC_ACCESS_DENIED: '#985050',
    CHAT_QUERY: '#0765FC',
    PLAN_REGENERATE: '#0765FC',
    MEMBER_INVITE: '#0765FC',
  };

  const distinctUsers = useMemo(() => Array.from(new Set(logs.map((l) => l.user))), [logs]);
  const distinctEvents = useMemo(() => Array.from(new Set(logs.map((l) => l.event))), [logs]);

  const filteredLogs = logs.filter((log) => {
    const userMatch = selectedUser === 'all' || log.user === selectedUser;
    const eventMatch = selectedEvent === 'all' || log.event === selectedEvent;
    return userMatch && eventMatch;
  });

  const handleExportCSV = () => {
    const headers = ['ID', '일시', '사용자', '이벤트', '대상 리소스', '결과'];
    const rows = filteredLogs.map((l) => [l.id, l.time, l.user, l.event, `"${l.target.replace(/"/g, '""')}"`, l.result]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob(csvContent, `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    showToast('감사 로그 CSV 파일이 다운로드되었습니다.', 'success');
    setIsExportModalOpen(false);
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(filteredLogs, null, 2);
    downloadBlob(jsonContent, `audit_logs_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    showToast('감사 로그 JSON 파일이 다운로드되었습니다.', 'success');
    setIsExportModalOpen(false);
  };

  const resetFilters = () => {
    setSelectedUser('all');
    setSelectedEvent('all');
    showToast('필터가 초기화되었습니다.', 'info');
  };

  return (
    <div className={styles.layout}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>보안 감사 로그</h1>
            <p className={styles.subtitle}>문서 조회, 접근 거부, AI 질의 및 멤버 초대 기록을 추적합니다.</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.exportBtn} onClick={() => setIsExportModalOpen(true)}>
              <Download size={16} /> 로그 내보내기
            </button>
            <button
              className={styles.workspaceBtn}
              onClick={() => router.push('/workspace-selection')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>마케팅팀 인수인계</span>
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')} title="알림 센터">
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')} title="AI 어시스턴트">
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {/* Filters Bar */}
          <div className={styles.filtersBar}>
            <div className={styles.filtersLeft}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>사용자</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className={styles.select}
                >
                  <option value="all">전체 사용자</option>
                  {distinctUsers.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>이벤트</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className={styles.select}
                >
                  <option value="all">전체 이벤트</option>
                  {distinctEvents.map((e) => (
                    <option key={e} value={e}>{getDisplayLabel(e)}</option>
                  ))}
                </select>
              </div>

              <button className={styles.resetBtn} onClick={resetFilters} title="필터 초기화">
                <RotateCcw size={16} /> 초기화
              </button>

              <button className={styles.resetBtn} onClick={fetchLogs} title="새로고침" style={{ marginLeft: '4px' }}>
                <RefreshCw size={16} /> 새로고침
              </button>
            </div>

            <div className={styles.filtersRight}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                총 <strong>{filteredLogs.length}</strong>건의 기록
              </span>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className={styles.card}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>일시</th>
                    <th>사용자</th>
                    <th>이벤트</th>
                    <th>대상 리소스</th>
                    <th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => {
                        setSelectedLog(log);
                        setIsEventDetailsOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className={styles.timeCell}>{log.time}</td>
                      <td className={styles.userCell}>
                        <div className={styles.userAvatar}>{log.user.charAt(0)}</div>
                        <span>{log.user}</span>
                      </td>
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
                          <span
                            className={styles.resultDot}
                            style={{ backgroundColor: log.resultColor }}
                          />
                          {log.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <div className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <span
                className={styles.eventBadgeLarge}
                style={{
                  backgroundColor: eventBgColors[selectedLog.event] || '#E8F1FF',
                  color: eventColors[selectedLog.event] || '#0765FC',
                }}
              >
                {getDisplayLabel(selectedLog.event)}
              </span>
              <span className={styles.eventTime}>{selectedLog.time}</span>
            </div>

            <div className={styles.eventDetailsList}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>수행자</span>
                <span className={styles.detailValue}>{selectedLog.user}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>대상 리소스</span>
                <span className={styles.detailValue}>{selectedLog.target}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>결과</span>
                <span className={styles.detailValue} style={{ color: selectedLog.resultColor, fontWeight: 600 }}>
                  {selectedLog.result}
                </span>
              </div>
              {selectedLog.metadata && (
                <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                  <span className={styles.detailLabel}>메타데이터 (JSON)</span>
                  <pre style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '11.5px', width: '100%', overflowX: 'auto' }}>
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Export Modal */}
      {isExportModalOpen && (
        <Modal
          open
          onClose={() => setIsExportModalOpen(false)}
          title="감사 로그 내보내기"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsExportModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.exportForm}>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
              현재 필터링된 <strong>{filteredLogs.length}건</strong>의 감사 로그를 파일로 다운로드합니다.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleExportCSV}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#0765FC',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Download size={16} /> CSV로 다운로드
              </button>
              <button
                onClick={handleExportJSON}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Download size={16} /> JSON으로 다운로드
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}