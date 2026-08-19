'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Download, MoreVertical, RotateCcw, ChevronLeft, ChevronRight, Bell, HelpCircle, X, Cloud, AlertTriangle, Trash2, FileText, Lock, Share2, MessageCircle, Sparkles, Send, Check, Settings } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel, faFilePowerpoint, faFileWord } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { getDocuments, uploadDocument, reprocessDocument, formatFileSize, formatFileType, sendChatMessage, type DocumentResponse } from '@/lib/api';
import { deleteDocument } from '@/lib/document';
import { useToast } from '@/components/ui/toast';
import { getWorkspaceId } from '@/lib/storage';
import styles from './file-management.module.css';

export default function FileManagementPage() {
  const router = useRouter();
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [files, setFiles] = useState<DocumentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // File Upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReprocessConfirmOpen, setIsReprocessConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isRbacSidePanelOpen, setIsRbacSidePanelOpen] = useState(false);

  // AI Modal chat states
  const [aiQuestionInput, setAiQuestionInput] = useState('');
  const [aiChatLogs, setAiChatLogs] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([]);
  const [isAiAnswering, setIsAiAnswering] = useState(false);

  // Upload form states
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadScope, setUploadScope] = useState('WORKSPACE');
  const [uploadRoles, setUploadRoles] = useState(['NEW_HIRE', 'MEMBER']);
  const [uploadDescription, setUploadDescription] = useState('');

  // Metadata form states
  const [metadataScope, setMetadataScope] = useState('WORKSPACE');
  const [metadataRoles, setMetadataRoles] = useState(['NEW_HIRE', 'MEMBER']);
  const [metadataTags, setMetadataTags] = useState('');
  const [metadataDescription, setMetadataDescription] = useState('');

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const response = await getDocuments({ page: 0, size: 20 });
      setFiles(response.items ?? []);
    } catch (err) {
      console.error('파일 목록 로드 실패:', err);
      showToast('파일 목록을 불러올 수 없습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedUploadFile) {
      showToast('업로드할 파일을 선택해 주세요.', 'error');
      return;
    }
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedUploadFile);
      if (uploadFileName.trim()) {
        formData.append('title', uploadFileName.trim());
      }
      formData.append('visibility', uploadScope);
      if (uploadScope === 'ROLE_BASED' && uploadRoles.length > 0) {
        formData.append('allowedRoles', uploadRoles.join(','));
      }

      await uploadDocument(formData);
      showToast('파일이 성공적으로 업로드되었습니다.', 'success');
      setIsUploadModalOpen(false);
      setSelectedUploadFile(null);
      setUploadFileName('');
      await loadFiles();
    } catch (err: any) {
      console.error('업로드 실패:', err);
      showToast(err.message || '파일 업로드에 실패했습니다.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFile = (doc: DocumentResponse) => {
    if (!doc) return;
    const textData = `[OnboardOS 사내 문서: ${doc.title}]\n\n상태: ${doc.status}\n공개 범위: ${doc.visibility}\n학습 조각 수: ${doc.chunkCount ?? 0}\n등록일: ${formatDocDate(doc.createdAt)}\n업데이트: ${formatDocDate(doc.updatedAt)}\n`;
    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.title.includes('.') ? doc.title : `${doc.title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`'${doc.title}' 다운로드가 시작되었습니다.`, 'success');
  };

  const handleAskDocumentAI = async () => {
    if (!aiQuestionInput.trim() || isAiAnswering || !currentFile) return;
    const q = aiQuestionInput.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAiQuestionInput('');
    setAiChatLogs((prev) => [...prev, { sender: 'user', text: q, time: timeStr }]);
    setIsAiAnswering(true);

    try {
      const response = await sendChatMessage(`[문서: ${currentFile.title}] ${q}`);
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAiChatLogs((prev) => [
        ...prev,
        { sender: 'ai', text: response.answer || '답변을 생성했습니다.', time: aiTime },
      ]);
    } catch (err: any) {
      showToast(err.message || '답변 생성 실패', 'error');
    } finally {
      setIsAiAnswering(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FontAwesomeIcon icon={faFilePdf} className={styles.iconPdf} />;
      case 'excel':
        return <FontAwesomeIcon icon={faFileExcel} className={styles.iconExcel} />;
      case 'pptx':
        return <FontAwesomeIcon icon={faFilePowerpoint} className={styles.iconPptx} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return '#10B981';
      case 'PROCESSING':
        return '#3B82F6';
      case 'PENDING':
        return '#F59E0B';
      case 'FAILED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const currentFile = files[selectedFile];

  /** 서버는 ISO 문자열을 준다 */
  const formatDocDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };
  const filteredFiles = selectedFilter === 'all'
    ? files
    : files.filter(f => f.status === selectedFilter);

  const selectedCount = 0;

  return (
    <div className={styles.container}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>파일 탐색</h1>
            <p className={styles.description}>업로드된 업무 문서를 최신 상태와 권한 기준으로 관리하세요.</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.workspaceBtn} onClick={() => router.push('/workspace-selection')}>
              워크스페이스 전환
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')}>
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        <div className={styles.contentArea}>
          {/* Left Section - Files */}
          <div className={styles.leftSection}>
            {/* Search and Upload */}
            <div className={styles.searchBar}>
              <Search size={18} color="#6B7280" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="파일명 또는 키워드 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button className={styles.uploadBtn} onClick={() => setIsUploadModalOpen(true)}>파일 업로드</button>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
              {['all', 'PENDING', 'PROCESSING', 'READY', 'FAILED'].map((filter) => (
                <button
                  key={filter}
                  className={`${styles.filterTag} ${selectedFilter === filter ? styles.activeFilter : ''}`}
                  onClick={() => setSelectedFilter(filter)}
                >
                  {filter === 'all' ? '전체' : filter}
                </button>
              ))}
              <div className={styles.docCount}>문서 {filteredFiles.length}개</div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <div className={styles.colCheckbox}>
                  <input type="checkbox" />
                </div>
                <div className={styles.colName}>문서</div>
                <div className={styles.colStatus}>상태</div>
                <div className={styles.colScope}>공개 범위</div>
                <div className={styles.colRoles}>허용 역할</div>
                <div className={styles.colCheck}>체크</div>
                <div className={styles.colUpdate}>업데이트 날</div>
                <div className={styles.colAction}>공</div>
              </div>

              <div className={styles.tableBody}>
                {filteredFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    className={`${styles.tableRow} ${idx === selectedFile ? styles.selectedRow : ''}`}
                    onClick={() => setSelectedFile(idx)}
                  >
                    <div className={styles.colCheckbox}>
                      <input type="checkbox" />
                    </div>
                    <div className={styles.colName}>
                      <div className={styles.fileIcon}>
                        {getFileIcon(formatFileType(file.mimeType, file.title))}
                      </div>
                      <span className={styles.fileName}>{file.title}</span>
                    </div>
                    <div className={styles.colStatus}>
                      <span
                        className={styles.statusBadge}
                        style={{ color: getStatusColor(file.status) }}
                      >
                        {file.status}
                      </span>
                    </div>
                    <div className={styles.colScope}>{file.visibility ?? '-'}</div>
                    <div className={styles.colRoles}>
                      {(file.allowedRoles ?? []).map((role, i) => (
                        <span key={i} className={styles.roleBadge}>{role}</span>
                      ))}
                    </div>
                    <div className={styles.colCheck}>{file.chunkCount ?? '—'}</div>
                    <div className={styles.colUpdate}>{formatDocDate(file.updatedAt ?? file.createdAt)}</div>
                    <div className={styles.colAction}>
                      {file.status === 'FAILED' ? (
                        <button className={styles.retryBtn} onClick={() => {
                          setSelectedFile(idx);
                          setIsReprocessConfirmOpen(true);
                        }}>🔄</button>
                      ) : (
                        <button className={styles.moreBtn} onClick={() => {
                          setSelectedFile(idx);
                          setIsActionsMenuOpen(true);
                        }}><MoreVertical size={16} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <span className={styles.selectionInfo}>{selectedCount}개 선택됨</span>
              <select className={styles.pageSelect}>
                <option>페이지당 10개</option>
                <option>페이지당 20개</option>
              </select>
              <div className={styles.pageNumbers}>
                <button className={styles.pageBtn}><ChevronLeft size={16} /></button>
                <span className={styles.currentPage}>1 / 2</span>
                <button className={styles.pageBtn}><ChevronRight size={16} /></button>
              </div>
            </div>

            {/* Footer Note */}
            <div className={styles.footerNote}>
              <span>업로드 시 공개 범위와 allowedRoles 를 설정할 수 있으며, 접근한 문서는 재처리 상 깔끔합니다.</span>
            </div>
          </div>

          {/* Right Section - File Details */}
          <aside className={styles.rightSection}>
            {currentFile && (
              <div className={styles.detailsCard}>
                <div className={styles.detailsHeader}>
                  <div className={styles.detailsTitle}>
                    <div className={styles.fileDetailsIcon}>
                      {getFileIcon(formatFileType(currentFile.mimeType, currentFile.title))}
                    </div>
                    <span>{currentFile.title}</span>
                  </div>
                  <span
                    className={styles.detailsStatus}
                    style={{ color: getStatusColor(currentFile.status) }}
                  >
                    {currentFile.status}
                  </span>
                </div>

                <div className={styles.detailsActions}>
                  <button className={styles.aiBtn} onClick={() => {
                    setAiChatLogs([
                      {
                        sender: 'ai',
                        text: `'${currentFile.title}' 문서에 대해 궁금한 점을 질문해 보세요!`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      }
                    ]);
                    setIsDetailsModalOpen(true);
                  }}>
                    AI에게 질문
                  </button>
                  <button className={styles.downloadBtn} onClick={() => handleDownloadFile(currentFile)}>
                    <Download size={16} /> 다운로드
                  </button>
                  <button className={styles.menuBtn} onClick={() => setIsActionsMenuOpen(true)}>
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className={styles.detailsMeta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>문서 ID</span>
                    <span className={styles.metaValue}>{currentFile.id}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>상태</span>
                    <span
                      className={styles.metaValueStatus}
                      style={{ color: getStatusColor(currentFile.status) }}
                    >
                      {currentFile.status}
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>공개 범위</span>
                    <span className={styles.metaValue}>{currentFile.visibility ?? '-'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>허용 역할</span>
                    <div className={styles.metaValueRoles}>
                      {(currentFile.allowedRoles ?? []).map((role, i) => (
                        <span key={i} className={styles.roleBadge}>{role}</span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>학습 조각</span>
                    <span className={styles.metaValue}>{currentFile.chunkCount ?? '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>파일 크기</span>
                    <span className={styles.metaValue}>{formatFileSize(currentFile.sizeBytes)}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>업데이트</span>
                    <span className={styles.metaValue}>{formatDocDate(currentFile.updatedAt)}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>등록일</span>
                    <span className={styles.metaValue}>{formatDocDate(currentFile.createdAt)}</span>
                  </div>
                  {currentFile.errorMessage && (
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>오류</span>
                      <span className={styles.metaValue}>{currentFile.errorMessage}</span>
                    </div>
                  )}
                </div>

                <div className={styles.detailsActions2}>
                  <button className={styles.reprocessBtn} onClick={() => setIsReprocessConfirmOpen(true)}>
                    <RotateCcw size={16} /> 문서 재처리
                  </button>
                  <button className={styles.rbacBtn} onClick={() => setIsRbacSidePanelOpen(true)}>
                    Documents · RBAC
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. File Upload Modal */}
      {isUploadModalOpen && (
        <Modal
          open
          onClose={() => setIsUploadModalOpen(false)}
          title="파일 업로드"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsUploadModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isUploading}
                onClick={handleUploadSubmit}
              >
                <Cloud size={16} /> 업로드
              </ModalPrimaryButton>
            </>
          }
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedUploadFile(file);
                if (!uploadFileName) {
                  setUploadFileName(file.name.replace(/\.[^/.]+$/, ''));
                }
              }
            }}
          />

          {/* Drag and Drop Area */}
          <div
            className={styles.uploadArea}
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: 'pointer', border: selectedUploadFile ? '2px dashed #4F46E5' : undefined }}
          >
            <Cloud size={48} color={selectedUploadFile ? '#4F46E5' : '#9CA3AF'} />
            <p className={styles.uploadTitle}>
              {selectedUploadFile ? `선택된 파일: ${selectedUploadFile.name}` : '파일을 드래그 앤 드롭하거나 클릭하여 업로드'}
            </p>
            <p className={styles.uploadSubtitle}>
              {selectedUploadFile ? `${formatFileSize(selectedUploadFile.size)} • 클릭하여 변경` : 'PDF, DOCX, XLSX, PPTX, TXT'}
            </p>
          </div>

          {/* Form Fields */}
          <div className={styles.formGroup}>
            <label className={styles.label}>문서명</label>
            <input
              type="text"
              value={uploadFileName}
              onChange={(e) => setUploadFileName(e.target.value)}
              placeholder="예: 행사운영가이드"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>공개 범위</label>
            <select
              value={uploadScope}
              onChange={(e) => setUploadScope(e.target.value)}
              className={styles.select}
            >
              <option value="WORKSPACE">WORKSPACE (전체 공개)</option>
              <option value="ROLE_BASED">ROLE_BASED (지정 역할만)</option>
              <option value="PRIVATE">PRIVATE (비공개)</option>
            </select>
          </div>

          {uploadScope === 'ROLE_BASED' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>허용 역할</label>
              <div className={styles.rolesContainer}>
                {['NEW_HIRE', 'MEMBER', 'MANAGER', 'ADMIN'].map((role) => (
                  <div key={role} className={styles.roleCheckbox}>
                    <input
                      type="checkbox"
                      id={`role-${role}`}
                      checked={uploadRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUploadRoles([...uploadRoles, role]);
                        } else {
                          setUploadRoles(uploadRoles.filter(r => r !== role));
                        }
                      }}
                    />
                    <label htmlFor={`role-${role}`} className={styles.roleLabel}>{role}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>설명 (선택)</label>
            <textarea
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="문서에 대한 설명을 입력하세요."
              className={styles.textarea}
              rows={3}
            />
          </div>
        </Modal>
      )}

      {/* 2. AI Question Modal (File Details) */}
      {isDetailsModalOpen && currentFile && (
        <Modal
          open
          onClose={() => setIsDetailsModalOpen(false)}
          title={`AI 문서 질문 • ${currentFile.title}`}
        >
          <div className={styles.chatContainer}>
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {aiChatLogs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: log.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '2px' }}>{log.time}</div>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      maxWidth: '85%',
                      fontSize: '13.5px',
                      lineHeight: 1.5,
                      backgroundColor: log.sender === 'user' ? '#4F46E5' : '#F3F4F6',
                      color: log.sender === 'user' ? '#FFFFFF' : '#1F2937',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {log.text}
                  </div>
                </div>
              ))}

              {isAiAnswering && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px' }}>
                  <Sparkles size={14} color="#4F46E5" />
                  <span>문서를 검색하고 답변을 생성하고 있습니다...</span>
                </div>
              )}
            </div>

            {/* Follow-up question */}
            <div className={styles.followUpContainer}>
              <input
                type="text"
                placeholder="문서에 대해 추가 질문을 입력하세요 (Enter)"
                value={aiQuestionInput}
                onChange={(e) => setAiQuestionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAskDocumentAI();
                  }
                }}
                disabled={isAiAnswering}
                className={styles.followUpInput}
              />
              <button
                className={styles.sendBtn}
                onClick={handleAskDocumentAI}
                disabled={!aiQuestionInput.trim() || isAiAnswering}
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          <div className={styles.aiFooterButtons} style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              className={styles.aiFooterBtn}
              onClick={() => router.push('/ai-chat')}
            >
              <Share2 size={14} /> 전체 AI 채팅으로 이동
            </button>
          </div>
        </Modal>
      )}

      {/* 3. 문서 재처리 확인 */}
      {isReprocessConfirmOpen && currentFile && (
        <Modal
          open
          onClose={() => setIsReprocessConfirmOpen(false)}
          title="문서 재처리"
          subtitle="실패한 문서를 다시 처리할 수 있습니다."
          size="sm"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsReprocessConfirmOpen(false)}>취소</ModalSecondaryButton>
              <ModalDangerButton
                onClick={async () => {
                  try {
                    await reprocessDocument(currentFile.id);
                    showToast('문서 재처리를 요청했습니다.', 'success');
                    setIsReprocessConfirmOpen(false);
                    await loadFiles();
                  } catch (err: any) {
                    showToast(err.message || '재처리 실패', 'error');
                  }
                }}
              >
                재처리 시작
              </ModalDangerButton>
            </>
          }
        >
          <div className={styles.confirmHeader}>
            <p>재처리를 시작하면 상태가 PENDING → PROCESSING 으로 변경되며,</p>
            <p>처리 결과에 따라 상태가 업데이트됩니다.</p>
          </div>

          <div className={styles.confirmContent}>
            <div className={styles.fileCard}>
              <FileText size={24} color="#DC2626" />
              <span>{currentFile.title}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. 문서 삭제 확인 */}
      {isDeleteConfirmOpen && currentFile && (
        <Modal
          open
          onClose={() => setIsDeleteConfirmOpen(false)}
          title="문서 삭제"
          size="sm"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDeleteConfirmOpen(false)}>취소</ModalSecondaryButton>
              <ModalDangerButton
                loading={isPending('file-management-2')}
                onClick={() => {
                  const wsId = getWorkspaceId();
                  if (!wsId) return;
                  run('file-management-2', '문서를 삭제했습니다.', () => {
                    setIsDeleteConfirmOpen(false);
                    setFiles(files.filter(f => f.id !== currentFile.id));
                  }, async () => {
                    await deleteDocument(wsId, currentFile.id);
                  });
                }}
              >
                휴지통으로 이동
              </ModalDangerButton>
            </>
          }
        >
          <div className={styles.deleteWarning}>
            <AlertTriangle size={48} color="#FCA5A5" />
          </div>

          <p className={styles.deleteMessage}>
            &apos;{currentFile.title}&apos;을 삭제하시겠습니까?
          </p>
          <p className={styles.deleteSubtext}>
            이 문서는 휴지통으로 이동되며, AI 답변에 담긴 내용은 더 이상 제공되지 않습니다.
          </p>

          <div className={styles.deleteFileCard}>
            <FileText size={20} color="#DC2626" />
            <span>{currentFile.title}</span>
          </div>

          <p className={styles.deleteFootnote}>휴지통에서는 30일 후 자동으로 완전 삭제됩니다.</p>
        </Modal>
      )}

      {/* 5. Metadata Settings Modal */}
      {isMetadataModalOpen && currentFile && (
        <Modal
          open
          onClose={() => setIsMetadataModalOpen(false)}
          title="문서 권한 설정"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsMetadataModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('file-management-3')}
                onClick={() => run('file-management-3', '변경 내용을 저장했습니다.', () => setIsMetadataModalOpen(false))}
              >
                저장
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.metadataFile}>
            <FileText size={24} color="#DC2626" />
            <span>{currentFile.title}</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>공개 범위</label>
            <select
              value={metadataScope}
              onChange={(e) => setMetadataScope(e.target.value)}
              className={styles.select}
            >
              <option value="WORKSPACE">WORKSPACE</option>
              <option value="ROLE_BASED">ROLE_BASED</option>
              <option value="PRIVATE">PRIVATE</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>허용 역할</label>
            <div className={styles.selectedRoles}>
              {metadataRoles.map((role, idx) => (
                <span key={idx} className={styles.roleTag}>
                  {role}
                  <button onClick={() => setMetadataRoles(metadataRoles.filter((_, i) => i !== idx))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className={styles.rolesContainer}>
              {['NEW_HIRE', 'MEMBER'].map((role) => (
                !metadataRoles.includes(role) && (
                  <button
                    key={role}
                    className={styles.roleAdd}
                    onClick={() => setMetadataRoles([...metadataRoles, role])}
                  >
                    + {role}
                  </button>
                )
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>태그</label>
            <input
              type="text"
              value={metadataTags}
              onChange={(e) => setMetadataTags(e.target.value)}
              placeholder="태그 입력하고 Enter 눌러 주기하세요."
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>설명</label>
            <textarea
              value={metadataDescription}
              onChange={(e) => setMetadataDescription(e.target.value)}
              placeholder="행사 운영 정책 및 체크리스트 상세 내용"
              className={styles.textarea}
              rows={3}
            />
            <span className={styles.charCount}>25 / 500</span>
          </div>
        </Modal>
      )}

      {/* 6. File Actions Menu */}
      {isActionsMenuOpen && currentFile && (
        <div className={styles.menuOverlay} onClick={() => setIsActionsMenuOpen(false)}>
          <div className={styles.actionMenu} onClick={(e) => e.stopPropagation()}>
            <button className={styles.actionMenuItem} onClick={() => {
              setIsDetailsModalOpen(true);
              setIsActionsMenuOpen(false);
            }}>
              <FileText size={16} /> 상세 보기
            </button>
            <button className={styles.actionMenuItem} onClick={() => {
              setIsMetadataModalOpen(true);
              setIsActionsMenuOpen(false);
            }}>
              <Lock size={16} /> 권한 설정
            </button>
            <button className={styles.actionMenuItem} onClick={() => {
              setIsDetailsModalOpen(true);
              setIsActionsMenuOpen(false);
            }}>
              <MessageCircle size={16} /> AI에게 질문
            </button>
            <button className={styles.actionMenuItem}>
              <Download size={16} /> 다운로드
            </button>
            <button className={styles.actionMenuItem} onClick={() => {
              setIsReprocessConfirmOpen(true);
              setIsActionsMenuOpen(false);
            }}>
              <RotateCcw size={16} /> 문서 재처리
            </button>
            <button className={styles.actionMenuItemDanger} onClick={() => {
              setIsDeleteConfirmOpen(true);
              setIsActionsMenuOpen(false);
            }}>
              <Trash2 size={16} /> 문서 삭제
            </button>
          </div>
        </div>
      )}

      {/* 7. RBAC Timeline Side Panel */}
      {isRbacSidePanelOpen && currentFile && (
        <div className={styles.sidePanelOverlay} onClick={() => setIsRbacSidePanelOpen(false)}>
          <div className={styles.sidePanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sidePanelHeader}>
              <h2>처리 이력</h2>
              <button
                onClick={() => setIsRbacSidePanelOpen(false)}
                className={styles.sidePanelCloseBtn}
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.sidePanelBody}>
              {/* Timeline */}
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#10B981' }}><Check size={14} /></div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>업로드 도입</p>
                    <p className={styles.timelineSubtext}>파일이 업로드되었습니다.</p>
                    <p className={styles.timelineTime}>08.16 18:21:01</p>
                  </div>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#3B82F6' }}><Settings size={14} /></div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>파일 처리</p>
                    <p className={styles.timelineSubtext}>파일이 처리되었습니다.</p>
                    <p className={styles.timelineTime}>08.16 18:15:18</p>
                  </div>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#10B981' }}><Check size={14} /></div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>체크 생성</p>
                    <p className={styles.timelineSubtext}>문서 42개의 체크 폴드가 생성되었습니다.</p>
                    <p className={styles.timelineTime}>08.16 18:15:29</p>
                  </div>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#10B981' }}><Check size={14} /></div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>입체된 완료</p>
                    <p className={styles.timelineSubtext}>파일이 입체되었습니다.</p>
                    <p className={styles.timelineTime}>08.16 18:17:48</p>
                  </div>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#10B981' }}><Check size={14} /></div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>READY 전환</p>
                    <p className={styles.timelineSubtext}>문서가 READY 상태로 전환되었습니다.</p>
                    <p className={styles.timelineTime}>08.16 18:21:01</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
