'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import {
  formatDateTime,
  formatFileSize,
  formatFileType,
  getDocuments,
  type DocumentResponse,
  type DocumentStatus,
} from '@/lib/api';
import { getDisplayLabel, getDisplayLabels } from '@/lib/display-labels';
import styles from './all-files-modal.module.css';

interface AllFilesModalProps {
  onClose: () => void;
  onSelectFile?: (file: DocumentResponse) => void;
  /** 파일을 골라 AI 질문으로 넘길 때 */
  onAskAboutFile?: (file: DocumentResponse) => void;
}

const STATUS_OPTIONS: Array<{ value: '' | DocumentStatus; label: string }> = [
  { value: '', label: '상태 전체' },
  { value: 'READY', label: '준비 완료' },
  { value: 'PROCESSING', label: '처리 중' },
  { value: 'PENDING', label: '대기 중' },
  { value: 'FAILED', label: '처리 실패' },
];

/** 서버는 유형 필터를 지원하지 않아 받아 온 페이지 안에서 걸러 준다 */
const TYPE_OPTIONS = [
  { value: '', label: '파일 유형 전체' },
  { value: 'PDF', label: 'PDF 문서' },
  { value: 'XLSX', label: '엑셀 문서' },
  { value: 'DOCX', label: '워드 문서' },
  { value: 'PPTX', label: '프레젠테이션' },
];

const PAGE_SIZES = [10, 20, 50];

export function AllFilesModal({ onClose, onSelectFile, onAskAboutFile }: AllFilesModalProps) {
  const [files, setFiles] = useState<DocumentResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [status, setStatus] = useState<'' | DocumentStatus>('');
  const [fileType, setFileType] = useState('');
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

  // 검색과 유형 필터는 서버가 지원하지 않아 현재 페이지 안에서만 걸러 준다
  const visibleFiles = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return files.filter(file => {
      if (q && !file.title.toLowerCase().includes(q)) return false;
      if (fileType && formatFileType(file.mimeType, file.title) !== fileType) return false;
      return true;
    });
  }, [files, keyword, fileType]);

  const getStatusClass = (value: string) => {
    if (value === 'READY') return styles.statusReady;
    if (value === 'PROCESSING' || value === 'PENDING') return styles.statusProcessing;
    return styles.statusFailed;
  };

  const goTo = (next: number) => {
    setPage(Math.min(Math.max(next, 0), Math.max(totalPages - 1, 0)));
  };

  // 현재 페이지 주변 최대 5개만 번호로 보여 준다
  const pageNumbers = useMemo(() => {
    if (totalPages === 0) return [];
    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  const isFiltered = keyword.trim() !== '' || fileType !== '';

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
          value={fileType}
          onChange={e => setFileType(e.target.value)}
          className={styles.select}
          aria-label="파일 유형"
        >
          {TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={e => {
            setStatus(e.target.value as '' | DocumentStatus);
            setPage(0);
          }}
          className={styles.select}
          aria-label="처리 상태"
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
            {isFiltered ? '검색 결과가 없습니다.' : '업로드된 파일이 없습니다.'}
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
                <tr
                  key={file.id}
                  className={styles.fileRow}
                  tabIndex={0}
                  onClick={() => onSelectFile?.(file)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectFile?.(file);
                    }
                  }}
                >
                  <td className={styles.fileName}>{file.title}</td>
                  <td>
                    <span className={`${styles.status} ${getStatusClass(file.status)}`}>
                      {getDisplayLabel(file.status)}
                    </span>
                  </td>
                  <td>{getDisplayLabel(formatFileType(file.mimeType, file.title))}</td>
                  <td>{getDisplayLabels(file.allowedRoles)}</td>
                  <td>{formatFileSize(file.sizeBytes)}</td>
                  <td>{formatDateTime(file.updatedAt ?? file.createdAt)}</td>
                  <td>
                    <button
                      className={styles.aiBtn}
                      onClick={event => {
                        event.stopPropagation();
                        onAskAboutFile?.(file);
                      }}
                    >
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
          {pageNumbers.map(number => (
            <button
              key={number}
              className={`${styles.pageBtn} ${number === page ? styles.active : ''}`}
              onClick={() => goTo(number)}
            >
              {number + 1}
            </button>
          ))}
          {totalPages === 0 && <span className={styles.pageInfo}>0 / 0</span>}
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
          aria-label="페이지 크기"
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
