'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import {
  formatFileSize,
  formatFileType,
  getDocuments,
  type DocumentResponse,
  type DocumentStatus,
} from '@/lib/api';
import styles from './all-files-modal.module.css';

interface AllFilesModalProps {
  onClose: () => void;
}

const STATUS_OPTIONS: Array<{ value: '' | DocumentStatus; label: string }> = [
  { value: '', label: '상태 전체' },
  { value: 'READY', label: 'READY' },
  { value: 'PROCESSING', label: 'PROCESSING' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'FAILED', label: 'FAILED' },
];

const PAGE_SIZES = [10, 20, 50];

export function AllFilesModal({ onClose }: AllFilesModalProps) {
  const [files, setFiles] = useState<DocumentResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [status, setStatus] = useState<'' | DocumentStatus>('');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDocuments({
        page,
        size,
        status: status || undefined,
      });
      setFiles(result.items ?? []);
      setTotalElements(result.totalElements ?? 0);
      setTotalPages(result.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 목록을 불러오지 못했습니다.');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, size, status]);

  useEffect(() => {
    // 페이지/페이지크기/상태가 바뀔 때마다 서버에서 다시 받아 온다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // 검색은 서버가 지원하지 않아 현재 페이지 안에서만 걸러 준다
  const visibleFiles = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return files;
    return files.filter(file => file.title.toLowerCase().includes(q));
  }, [files, keyword]);

  const getStatusClass = (value: string) => {
    if (value === 'READY') return styles.statusReady;
    if (value === 'PROCESSING' || value === 'PENDING') return styles.statusProcessing;
    return styles.statusFailed;
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const goTo = (next: number) => {
    setPage(Math.min(Math.max(next, 0), Math.max(totalPages - 1, 0)));
  };

  return (
    <Modal open onClose={onClose} title="전체 파일 보기" size="xl">
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="현재 페이지에서 파일명 검색"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>
        <select
          value={status}
          onChange={e => {
            setStatus(e.target.value as '' | DocumentStatus);
            setPage(0);
          }}
          className={styles.select}
        >
          {STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div className={styles.stateRow}>불러오는 중...</div>
        ) : error ? (
          <div className={styles.stateRow}>
            {error}
            <button type="button" className={styles.retryBtn} onClick={() => void load()}>
              다시 시도
            </button>
          </div>
        ) : visibleFiles.length === 0 ? (
          <div className={styles.stateRow}>
            {keyword.trim() ? '검색 결과가 없습니다.' : '업로드된 파일이 없습니다.'}
          </div>
        ) : (
          <table className={styles.filesTable}>
            <thead>
              <tr>
                <th>파일명</th>
                <th>상태</th>
                <th>유형</th>
                <th>허용 역할</th>
                <th>크기</th>
                <th>업데이트</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {visibleFiles.map(file => (
                <tr key={file.id}>
                  <td className={styles.fileName}>{file.title}</td>
                  <td>
                    <span className={`${styles.status} ${getStatusClass(file.status)}`}>
                      {file.status}
                    </span>
                  </td>
                  <td>{formatFileType(file.mimeType, file.title)}</td>
                  <td>{file.allowedRoles?.length ? file.allowedRoles.join(', ') : '-'}</td>
                  <td>{formatFileSize(file.sizeBytes)}</td>
                  <td>{formatDate(file.updatedAt ?? file.createdAt)}</td>
                  <td>
                    <button className={styles.aiBtn}>
                      <Sparkles size={14} /> AI에게 질문
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.pagination}>
        <span className={styles.totalCount}>전체 {totalElements}개</span>
        <div className={styles.pageNumbers}>
          <button className={styles.pageBtn} onClick={() => goTo(0)} disabled={page === 0}>
            «
          </button>
          <button className={styles.pageBtn} onClick={() => goTo(page - 1)} disabled={page === 0}>
            ‹
          </button>
          <span className={styles.pageInfo}>
            {totalPages === 0 ? 0 : page + 1} / {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages - 1}
          >
            ›
          </button>
          <button
            className={styles.pageBtn}
            onClick={() => goTo(totalPages - 1)}
            disabled={page >= totalPages - 1}
          >
            »
          </button>
        </div>
        <select
          className={styles.perPage}
          value={size}
          onChange={e => {
            setSize(Number(e.target.value));
            setPage(0);
          }}
        >
          {PAGE_SIZES.map(value => (
            <option key={value} value={value}>
              {value}개씩 보기
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
}
