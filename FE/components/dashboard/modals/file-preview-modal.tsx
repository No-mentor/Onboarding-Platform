'use client';

import React from 'react';
import { Download, Sparkles, FileText, ChevronRight } from 'lucide-react';
import { Modal, ModalSecondaryButton } from '@/components/ui/modal';
import styles from './file-preview-modal.module.css';

interface FilePreviewModalProps {
  onClose: () => void;
}

export function FilePreviewModal({ onClose }: FilePreviewModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title="문서 상세"
      size="lg"
      footer={<ModalSecondaryButton onClick={onClose}>닫기</ModalSecondaryButton>}
    >
      <div className={styles.content}>
        <div className={styles.fileInfo}>
          <div className={styles.fileIcon}>
            <FileText size={28} />
          </div>
          <div className={styles.details}>
            <h3 className={styles.fileName}>예산안 샘플 업데이트</h3>
            <div className={styles.detailRow}>
              <span className={styles.label}>상태</span>
              <span className={styles.value}>진행 지연</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>사유</span>
              <span className={styles.value}>결재자의 승인이 아직 완료되지 않음</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>다음 제안</span>
              <span className={styles.value}>
                결재자에게 승인을 다시 요청하거나, 연락 가능한 대체 담당자를 찾아보세요.
              </span>
            </div>
            <button className={styles.moreLink}>
              관련 대화 보기 <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.statsCard}>
            <h4>병목 요약</h4>
            <p>총 2건의 병목이 있습니다.</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.actionBtn}>
              <Download size={16} />
              다운로드
            </button>
            <button className={styles.actionBtn}>
              <Sparkles size={16} />
              AI에게 질문
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
