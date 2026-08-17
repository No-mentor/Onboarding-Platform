'use client';

import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import styles from './all-files-modal.module.css';

interface AllFilesModalProps {
  onClose: () => void;
}

export function AllFilesModal({ onClose }: AllFilesModalProps) {
  const [sortBy, setSortBy] = useState('date');
  const [filterBy, setFilterBy] = useState('all');

  const files = [
    { id: 1, name: '행사운영가이드 .pdf', type: 'PDF', size: '5.8MB', status: 'READY', date: '2024.05.20 10:30' },
    { id: 2, name: '행사_예산안_v7.xlsx', type: 'XLSX', size: '2.4MB', status: 'READY', date: '2024.05.20 09:15' },
    { id: 3, name: '거래처_연락망.xlsx', type: 'XLSX', size: '1.6MB', status: 'READY', date: '2024.05.19 16:40' },
    { id: 4, name: '마케팅 인수인계 문서.docx', type: 'DOCX', size: '3.2MB', status: 'READY', date: '2024.05.19 14:22' },
    { id: 5, name: '예산안 설물 업데이트.pptx', type: 'PPTX', size: '4.1MB', status: 'READY', date: '2024.05.19 11:05' },
    { id: 6, name: '브랜드 가이드라인.pdf', type: 'PDF', size: '7.3MB', status: 'READY', date: '2024.05.18 17:30' },
    { id: 7, name: '행페인 기획안 초안.docx', type: 'DOCX', size: '2.8MB', status: 'PROCESSING', date: '2024.05.18 13:10' },
    { id: 8, name: '권고 집합 현황_5월.xlsx', type: 'XLSX', size: '1.9MB', status: 'FAILED', date: '2024.05.17 18:45' },
  ];

  const getStatusClass = (status: string) => {
    if (status === 'READY') return styles.statusReady;
    if (status === 'PROCESSING') return styles.statusProcessing;
    return styles.statusFailed;
  };

  return (
    <Modal open onClose={onClose} title="전체 파일 보기" size="xl">
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input type="text" placeholder="파일명, 키워드, 태그로 검색" />
        </div>
        <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)} className={styles.select}>
          <option value="all">파일 유형 전체</option>
          <option value="pdf">PDF</option>
          <option value="xlsx">XLSX</option>
          <option value="docx">DOCX</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.select}>
          <option value="date">상태 전체</option>
          <option value="ready">READY</option>
          <option value="processing">PROCESSING</option>
        </select>
        <select className={styles.select}>
          <option value="recent">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="size">크기순</option>
        </select>
      </div>

      <div className={styles.tableWrapper}>
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
            {files.map((file) => (
              <tr key={file.id}>
                <td className={styles.fileName}>{file.name}</td>
                <td>
                  <span className={`${styles.status} ${getStatusClass(file.status)}`}>{file.status}</span>
                </td>
                <td>{file.type}</td>
                <td>-</td>
                <td>{file.size}</td>
                <td>{file.date}</td>
                <td>
                  <button className={styles.aiBtn}>
                    <Sparkles size={14} /> AI에게 질문
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span className={styles.totalCount}>전체 24개</span>
        <div className={styles.pageNumbers}>
          <button className={styles.pageBtn}>«</button>
          <button className={styles.pageBtn}>‹</button>
          <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
          <button className={styles.pageBtn}>2</button>
          <button className={styles.pageBtn}>3</button>
          <button className={styles.pageBtn}>›</button>
          <button className={styles.pageBtn}>»</button>
        </div>
        <select className={styles.perPage}>
          <option>10개씩 보기</option>
          <option>20개씩 보기</option>
          <option>50개씩 보기</option>
        </select>
      </div>
    </Modal>
  );
}
