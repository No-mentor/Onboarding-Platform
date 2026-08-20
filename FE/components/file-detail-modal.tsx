'use client';

import React, { useState } from 'react';
import { X, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import {
  deleteDocument,
  formatDateTime,
  formatFileSize,
  formatFileType,
  reprocessDocument,
  type DocumentResponse,
} from '@/lib/api';
import { useToast } from './ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import styles from './file-detail-modal.module.css';

interface FileDetailModalProps {
  file: DocumentResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function FileDetailModal({ file, isOpen, onClose, onRefresh }: FileDetailModalProps) {
  const { showToast } = useToast();
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReprocess = async () => {
    if (!file) return;
    setIsReprocessing(true);
    setError(null);

    try {
      await reprocessDocument(file.id);
      showToast('파일 재처리를 시작했습니다.', 'success');
      onRefresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '재처리 실패');
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleDelete = async () => {
    if (!file || !confirm('정말 삭제하시겠습니까?')) return;
    setIsDeleting(true);
    setError(null);

    try {
      await deleteDocument(file.id);
      showToast('파일이 삭제되었습니다.', 'success');
      onRefresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{file.title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {/* 파일 정보 */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>파일 정보</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>파일명</span>
                <span className={styles.value}>{file.title}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>파일 타입</span>
                <span className={styles.value}>
                  {getDisplayLabel(formatFileType(file.mimeType, file.title))}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>크기</span>
                <span className={styles.value}>{formatFileSize(file.sizeBytes)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>공개 범위</span>
                <span className={styles.value}>
                  {file.visibility ? getDisplayLabel(file.visibility) : '-'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>업로드 날짜</span>
                <span className={styles.value}>{formatDateTime(file.createdAt)}</span>
              </div>
              {file.updatedAt && (
                <div className={styles.infoItem}>
                  <span className={styles.label}>처리 완료</span>
                  <span className={styles.value}>{formatDateTime(file.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 상태 */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>처리 상태</h3>
            <div className={styles.statusBox}>
              <span className={`${styles.status} ${styles[`status-${file.status.toLowerCase()}`]}`}>
                {getDisplayLabel(file.status)}
              </span>
              {file.status === 'PROCESSING' && (
                <p className={styles.statusNote}>현재 인공지능이 문서를 분석중입니다. 잠시 후 다시 확인해주세요.</p>
              )}
              {file.status === 'FAILED' && (
                <p className={styles.statusNote}>
                  {file.errorMessage ?? '문서 분석에 실패했습니다. 다시 시도해주세요.'}
                </p>
              )}
              {file.status === 'READY' && file.chunkCount !== null && file.chunkCount !== undefined && (
                <p className={styles.statusNote}>{file.chunkCount}개의 학습 조각으로 나뉘어 저장되었습니다.</p>
              )}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.secondaryBtn} onClick={onClose}>
            닫기
          </button>
          {file.status !== 'PROCESSING' && (
            <button
              className={styles.primaryBtn}
              onClick={() => void handleReprocess()}
              disabled={isReprocessing}
            >
              <RefreshCw size={16} />
              {isReprocessing ? '재처리 중...' : '다시 분석'}
            </button>
          )}
          <button
            className={styles.dangerBtn}
            onClick={() => void handleDelete()}
            disabled={isDeleting}
          >
            <Trash2 size={16} />
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
