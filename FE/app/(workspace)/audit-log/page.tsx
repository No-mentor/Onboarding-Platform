'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, RotateCcw, Bell, HelpCircle, Calendar, Download } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useMe } from '@/components/require-workspace';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  getAuditLogs,
  getMembers,
  type AuditLogResponse,
  type MemberResponse,
} from '@/lib/api';
import styles from './audit-log.module.css';

/** 서버가 기록하는 이벤트 유형 (audit 호출부 기준) */
const KNOWN_EVENT_TYPES = ['CHAT_QUERY', 'DOC_ACCESS_DENIED'];

const PAGE_SIZES = [10, 20, 50];

type QuickRange = 'today' | '7days' | '30days' | 'custom';

/** datetime-local 입력값 형식으로 */
function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 서버는 ISO-8601(OffsetDateTime) 을 요구한다 */
function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const EVENT_BG: Record<string, string> = {
  CHAT_QUERY: '#E8F1FF',
  DOC_ACCESS_DENIED: '#F8EEEE',
};

const EVENT_FG: Record<string, string> = {
  CHAT_QUERY: '#0765FC',
  DOC_ACCESS_DENIED: '#985050',
};

/** 허용/거부에 따라 색을 다르게 준다 */
function resultColor(result: string): string {
  return result === 'SUCCESS' ? '#287456' : '#985050';
}

export default function AuditLogPage() {
  const router = useRouter();
  const me = useMe();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 조회 버튼을 눌렀을 때 서버로 보내는 조건
  const [appliedFilters, setAppliedFilters] = useState<{
    actorId?: string;
    eventType?: string;
    from?: string;
    to?: string;
  }>({});

  // 입력 중인 조건
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeRange, setActiveRange] = useState<QuickRange>('7days');

  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDeniedSummaryOpen, setIsDeniedSummaryOpen] = useState(false);
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);
  /** 캘린더에서 보고 있는 달 (시작/종료 각각) */
  const [startMonth, setStartMonth] = useState<{ year: number; month: number } | null>(null);
  const [endMonth, setEndMonth] = useState<{ year: number; month: number } | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [includeMetadata, setIncludeMetadata] = useState(false);

  // 기본 기간(최근 7일)은 서버 렌더 시점에 계산하면 하이드레이션이 어긋나므로 마운트 후에 넣는다
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    // 기본값 주입은 의도한 1회 초기화다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartDate(toDateTimeLocal(start));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndDate(toDateTimeLocal(end));
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAuditLogs({ page, size, ...appliedFilters });
      setLogs(response.items ?? []);
      setTotalElements(response.totalElements ?? 0);
      setTotalPages(response.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '감사 로그를 불러오지 못했습니다.');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, size, appliedFilters]);

  useEffect(() => {
    // 페이지/크기/조건이 바뀔 때마다 서버에서 다시 받아 온다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    // 행위자 이름을 보여 주기 위해 구성원 목록을 함께 받아 둔다
    void (async () => {
      try {
        const response = await getMembers(0, 100);
        setMembers(response.items ?? []);
      } catch {
        // 구성원 조회 권한이 없어도 로그 자체는 볼 수 있어야 한다
      }
    })();
  }, []);

  /** userId -> 이름. 서버 로그에는 actorId(UUID) 만 들어 있다 */
  const actorName = useCallback(
    (actorId: string | null) => {
      if (!actorId) return '시스템';
      const member = members.find(m => m.userId === actorId);
      return member?.name ?? `${actorId.slice(0, 8)}…`;
    },
    [members]
  );

  const eventOptions = useMemo(() => {
    const set = new Set(KNOWN_EVENT_TYPES);
    for (const log of logs) set.add(log.eventType);
    return [...set];
  }, [logs]);

  const selectQuickRange = (range: 'today' | '7days' | '30days') => {
    const end = new Date();
    const start = new Date();
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
    selectQuickRange('7days');
    setPage(0);
    setAppliedFilters({});
  };

  const queryLogs = () => {
    if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
      showToast('시작 일시는 종료 일시보다 빠르게 설정해 주세요.', 'error');
      return;
    }
    setPage(0);
    setAppliedFilters({
      actorId: selectedUser === 'all' ? undefined : selectedUser,
      eventType: selectedEvent === 'all' ? undefined : selectedEvent,
      from: toIso(startDate),
      to: toIso(endDate),
    });
  };

  /** 캘린더에 그릴 42칸(6주) 구성 */
  const buildCalendar = (year: number, month: number) => {
    const first = new Date(year, month, 1);
    const leading = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ key: string; day: number; inMonth: boolean; date: Date }> = [];

    for (let i = leading; i > 0; i -= 1) {
      const date = new Date(year, month, 1 - i);
      cells.push({ key: `prev-${date.getTime()}`, day: date.getDate(), inMonth: false, date });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ key: `cur-${year}-${month}-${day}`, day, inMonth: true, date: new Date(year, month, day) });
    }
    while (cells.length % 7 !== 0) {
      const date = new Date(year, month + 1, cells.length - leading - daysInMonth + 1);
      cells.push({ key: `next-${date.getTime()}`, day: date.getDate(), inMonth: false, date });
    }
    return cells;
  };

  /** datetime-local 값에서 날짜만 바꾼다 (시각은 유지) */
  const applyDate = (current: string, date: Date, fallbackTime: string): string => {
    const time = current.includes('T') ? current.split('T')[1] : fallbackTime;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
  };

  const isSameDay = (value: string, date: Date) => {
    if (!value) return false;
    const parsed = new Date(value);
    return (
      parsed.getFullYear() === date.getFullYear() &&
      parsed.getMonth() === date.getMonth() &&
      parsed.getDate() === date.getDate()
    );
  };

  const openTimeRange = () => {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    setStartMonth({ year: start.getFullYear(), month: start.getMonth() });
    setEndMonth({ year: end.getFullYear(), month: end.getMonth() });
  };

  const shiftMonth = (which: 'start' | 'end', delta: number) => {
    const setter = which === 'start' ? setStartMonth : setEndMonth;
    setter(prev => {
      if (!prev) return prev;
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const selectedLog = logs.find(log => log.id === selectedLogId) ?? null;

  /** 거부(DENIED) 이벤트를 행위자별로 모은다 */
  const deniedByActor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of logs) {
      if (log.result === 'SUCCESS') continue;
      const key = log.actorId ?? 'system';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [logs]);

  const handleExport = () => {
    const rows = logs.map(log => ({
      시간: formatLogTime(log.createdAt),
      행위자: actorName(log.actorId),
      이벤트: log.eventType,
      대상유형: log.resourceType ?? '',
      대상ID: log.resourceId ?? '',
      결과: log.result,
      ...(includeMetadata ? { 메타데이터: JSON.stringify(log.metadata ?? {}) } : {}),
    }));

    if (rows.length === 0) {
      showToast('내보낼 로그가 없습니다.', 'error');
      return;
    }

    let blob: Blob;
    let filename: string;
    if (exportFormat === 'json') {
      blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      filename = 'audit-logs.json';
    } else {
      const headers = Object.keys(rows[0]);
      // 쉼표와 따옴표가 섞여도 깨지지 않도록 감싼다
      const escape = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
      const csv = [
        headers.join(','),
        ...rows.map(row => headers.map(header => escape((row as Record<string, unknown>)[header])).join(',')),
      ].join('\n');
      // 엑셀에서 한글이 깨지지 않도록 BOM 을 붙인다
      blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
      filename = 'audit-logs.csv';
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    showToast(`현재 페이지 ${rows.length}건을 내보냈습니다.`, 'success');
    setIsExportModalOpen(false);
  };

  const rangeStart = totalElements === 0 ? 0 : page * size + 1;
  const rangeEnd = Math.min((page + 1) * size, totalElements);

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
              {me?.currentWorkspace?.name ?? '업무 공간'}
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => setIsDeniedSummaryOpen(true)} title="거부 이벤트 요약">
              <Bell size={20} />
              {deniedByActor.length > 0 && (
                <span className={styles.badge}>{deniedByActor.reduce((sum, [, count]) => sum + count, 0)}</span>
              )}
            </button>
            <button
              className={styles.helpBtn}
              onClick={() => showToast('행위자·이벤트·기간으로 감사 로그를 조회할 수 있습니다.', 'success')}
            >
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
                  {members.map(member => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} ({getDisplayLabel(member.role)})
                    </option>
                  ))}
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
                  {eventOptions.map(eventType => (
                    <option key={eventType} value={eventType}>{getDisplayLabel(eventType)}</option>
                  ))}
                </select>
              </div>

              <div className={`${styles.filterGroup} ${styles.dateFilterGroup}`}>
                <div className={styles.dateFilterHeader}>
                  <label className={styles.filterLabel}>기간</label>
                  <div className={styles.quickRanges} aria-label="빠른 기간 선택">
                    <button className={activeRange === 'today' ? styles.quickRangeActive : styles.quickRange} onClick={() => selectQuickRange('today')}>오늘</button>
                    <button className={activeRange === '7days' ? styles.quickRangeActive : styles.quickRange} onClick={() => selectQuickRange('7days')}>최근 7일</button>
                    <button className={activeRange === '30days' ? styles.quickRangeActive : styles.quickRange} onClick={() => selectQuickRange('30days')}>최근 30일</button>
                    <button
                      className={activeRange === 'custom' ? styles.quickRangeActive : styles.quickRange}
                      onClick={() => { openTimeRange(); setIsTimeRangeOpen(true); }}
                    >
                      직접 선택
                    </button>
                  </div>
                </div>
                <div className={styles.dateRange}>
                  <label className={styles.dateField}>
                    <span>시작</span>
                    <Calendar size={16} />
                    <input
                      type="datetime-local"
                      className={styles.dateInput}
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(e) => { setStartDate(e.target.value); setActiveRange('custom'); }}
                    />
                  </label>
                  <span className={styles.dateRangeSeparator}>~</span>
                  <label className={styles.dateField}>
                    <span>종료</span>
                    <Calendar size={16} />
                    <input
                      type="datetime-local"
                      className={styles.dateInput}
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => { setEndDate(e.target.value); setActiveRange('custom'); }}
                    />
                  </label>
                </div>
              </div>

              <div className={styles.filterActions}>
                <button className={styles.queryBtn} onClick={queryLogs}>조회</button>
                <button className={styles.resetBtn} onClick={resetFilters}>
                  <RotateCcw size={16} />
                  초기화
                </button>
                <button className={styles.resetBtn} onClick={() => setIsExportModalOpen(true)}>
                  <Download size={16} />
                  내보내기
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
                  {isLoading ? (
                    <tr><td colSpan={5} className={styles.targetCell}>불러오는 중...</td></tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className={styles.targetCell}>
                        {error}{' '}
                        <button className={styles.resetBtn} onClick={() => void load()}>다시 시도</button>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={5} className={styles.targetCell}>조건에 맞는 로그가 없습니다.</td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => { setSelectedLogId(log.id); setIsEventDetailsOpen(true); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className={styles.timeCell}>{formatLogTime(log.createdAt)}</td>
                        <td className={styles.userCell}>{actorName(log.actorId)}</td>
                        <td>
                          <span
                            className={styles.eventBadge}
                            style={{
                              backgroundColor: EVENT_BG[log.eventType] ?? '#E8F1FF',
                              color: EVENT_FG[log.eventType] ?? '#0765FC',
                            }}
                          >
                            {getDisplayLabel(log.eventType)}
                          </span>
                        </td>
                        <td className={styles.targetCell}>
                          {log.resourceType ? getDisplayLabel(log.resourceType) : '-'}
                          {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}…` : ''}
                        </td>
                        <td>
                          <span className={styles.resultBadge} style={{ color: resultColor(log.result) }}>
                            {getDisplayLabel(log.result)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <select
                className={styles.perPageSelect}
                value={size}
                onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
                aria-label="페이지 크기"
              >
                {PAGE_SIZES.map(value => (
                  <option key={value} value={value}>{value}개씩 보기</option>
                ))}
              </select>

              <span className={styles.pageInfo}>
                전체 {totalElements}개 중 {rangeStart}~{rangeEnd}개
              </span>

              <div className={styles.paginationBtns}>
                <button className={styles.pagBtn} disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>&lt;</button>
                <span className={`${styles.pagBtn} ${styles.pagBtnActive}`} aria-current="page">
                  {totalPages === 0 ? 0 : page + 1}
                </span>
                <span className={styles.pageInfo}>/ {totalPages}</span>
                <button
                  className={styles.pagBtn}
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. 로그 상세 */}
      {isEventDetailsOpen && selectedLog && (
        <Modal
          open
          onClose={() => setIsEventDetailsOpen(false)}
          title="로그 상세 보기"
          footer={<ModalSecondaryButton onClick={() => setIsEventDetailsOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>시간</span>
            <span className={styles.detailValue}>{formatLogTime(selectedLog.createdAt)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>행위자</span>
            <span className={styles.detailValue}>
              {actorName(selectedLog.actorId)}
              {(() => {
                const member = members.find(m => m.userId === selectedLog.actorId);
                if (!member) return null;
                return (
                  <span className={styles.badge}>
                    {[getDisplayLabel(member.role), member.department].filter(Boolean).join(' · ')}
                  </span>
                );
              })()}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>이벤트</span>
            <span
              className={styles.eventBadge}
              style={{
                backgroundColor: EVENT_BG[selectedLog.eventType] ?? '#E8F1FF',
                color: EVENT_FG[selectedLog.eventType] ?? '#0765FC',
              }}
            >
              {getDisplayLabel(selectedLog.eventType)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>대상 유형</span>
            <span className={styles.detailValue}>
              {selectedLog.resourceType ? getDisplayLabel(selectedLog.resourceType) : '-'}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>대상 ID</span>
            <span className={styles.detailValue}>{selectedLog.resourceId ?? '-'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>결과</span>
            <span className={styles.resultBadge} style={{ color: resultColor(selectedLog.result) }}>
              {getDisplayLabel(selectedLog.result)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>워크스페이스</span>
            <span className={styles.detailValue}>{me?.currentWorkspace?.name ?? '-'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>관련 메타데이터</span>
            <div className={styles.metadata}>
              <code>{JSON.stringify(selectedLog.metadata ?? {}, null, 2)}</code>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. 내보내기 */}
      {isExportModalOpen && (
        <Modal
          open
          onClose={() => setIsExportModalOpen(false)}
          title="로그 내보내기"
          subtitle={`현재 페이지 ${logs.length}건`}
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsExportModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton onClick={handleExport}>
                <Download size={16} /> 내보내기
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
                <span>표 형식 파일 (CSV)</span>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={() => setExportFormat('json')}
                />
                <span>데이터 파일 (JSON)</span>
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>포함 범위</label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input type="checkbox" checked disabled />
                <span>기본 정보 (시간·행위자·이벤트·대상·결과)</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                />
                <span>메타데이터</span>
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. 기간 직접 선택 */}
      {isTimeRangeOpen && startMonth && endMonth && (
        <Modal
          open
          onClose={() => setIsTimeRangeOpen(false)}
          title="시간 범위 선택"
          size="lg"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsTimeRangeOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setIsTimeRangeOpen(false);
                  queryLogs();
                }}
              >
                적용
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.calendarGrid}>
            {([
              ['start', startMonth, startDate] as const,
              ['end', endMonth, endDate] as const,
            ]).map(([which, month, value]) => (
              <div key={which} className={styles.calendar}>
                <div className={styles.calendarHeader}>
                  <button onClick={() => shiftMonth(which, -1)} aria-label="이전 달">&laquo;</button>
                  <span>
                    {which === 'start' ? '시작' : '종료'} · {month.year}년 {month.month + 1}월
                  </span>
                  <button onClick={() => shiftMonth(which, 1)} aria-label="다음 달">&raquo;</button>
                </div>
                <div className={styles.calendarBody}>
                  <div className={styles.dayHeader}>
                    <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
                  </div>
                  <div className={styles.dayGrid}>
                    {buildCalendar(month.year, month.month).map((cell) => (
                      <button
                        key={cell.key}
                        className={`${styles.dayBtn} ${isSameDay(value, cell.date) ? styles.active : ''}`}
                        style={cell.inMonth ? undefined : { color: '#9CA3AF' }}
                        onClick={() => {
                          setActiveRange('custom');
                          if (which === 'start') {
                            setStartDate(applyDate(startDate, cell.date, '00:00'));
                          } else {
                            setEndDate(applyDate(endDate, cell.date, '23:59'));
                          }
                        }}
                      >
                        {cell.day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.timeRangePresets}>
            <button className={styles.presetBtn} onClick={() => { selectQuickRange('today'); openTimeRange(); }}>오늘</button>
            <button className={styles.presetBtn} onClick={() => { selectQuickRange('7days'); openTimeRange(); }}>최근 7일</button>
            <button className={styles.presetBtn} onClick={() => { selectQuickRange('30days'); openTimeRange(); }}>최근 30일</button>
          </div>

          <div className={styles.dateRange}>
            <label className={styles.dateField}>
              <span>시작</span>
              <Calendar size={16} />
              <input
                type="datetime-local"
                className={styles.dateInput}
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => { setStartDate(e.target.value); setActiveRange('custom'); }}
              />
            </label>
            <span className={styles.dateRangeSeparator}>~</span>
            <label className={styles.dateField}>
              <span>종료</span>
              <Calendar size={16} />
              <input
                type="datetime-local"
                className={styles.dateInput}
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => { setEndDate(e.target.value); setActiveRange('custom'); }}
              />
            </label>
          </div>
        </Modal>
      )}

      {/* 4. 거부 이벤트 요약 */}
      {isDeniedSummaryOpen && (
        <Modal
          open
          onClose={() => setIsDeniedSummaryOpen(false)}
          title="거부 이벤트 요약"
          subtitle="현재 조회된 페이지 기준"
          footer={<ModalSecondaryButton onClick={() => setIsDeniedSummaryOpen(false)}>닫기</ModalSecondaryButton>}
        >
          {deniedByActor.length === 0 ? (
            <div className={styles.permissionItem}>
              <div className={styles.permissionContent}>
                <div className={styles.permissionRow}>
                  <span className={styles.permissionLabel}>거부 이벤트</span>
                  <span className={styles.permissionValue}>없음</span>
                </div>
              </div>
            </div>
          ) : (
            deniedByActor.map(([actorId, count]) => (
              <div key={actorId} className={styles.permissionItem}>
                <div className={styles.permissionHeader}>
                  <h3>{actorName(actorId === 'system' ? null : actorId)}</h3>
                </div>
                <div className={styles.permissionContent}>
                  <div className={styles.permissionRow}>
                    <span className={styles.permissionLabel}>거부/오류 건수</span>
                    <span className={styles.permissionValue}>{count}건</span>
                  </div>
                  <div className={styles.permissionRow}>
                    <span className={styles.permissionLabel}>관련 이벤트</span>
                    <span className={styles.permissionValue}>
                      {[
                        ...new Set(
                          logs
                            .filter(log => (log.actorId ?? 'system') === actorId && log.result !== 'SUCCESS')
                            .map(log => getDisplayLabel(log.eventType))
                        ),
                      ].join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </Modal>
      )}
    </div>
  );
}
