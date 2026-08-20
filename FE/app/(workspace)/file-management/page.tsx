'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, MoreVertical, RotateCcw, ChevronLeft, ChevronRight, Bell, HelpCircle, X, Cloud, AlertTriangle, Trash2, FileText, Lock, MessageCircle, Sparkles, Send, Check, Settings } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel, faFilePowerpoint } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { Markdown } from '@/components/ui/markdown';
import { useToast } from '@/components/ui/toast';
import { useMe } from '@/components/require-workspace';
import { saveWorkspaceId } from '@/lib/storage';
import { getDisplayLabel, getDisplayLabels } from '@/lib/display-labels';
import {
  citationTitle,
  deleteDocument,
  formatDateTime,
  formatFileSize,
  formatFileType,
  getDocuments,
  reprocessDocument,
  sendChatMessage,
  uploadDocument,
  type DocumentResponse,
  type DocumentStatus,
  type DocumentVisibility,
  type WorkspaceRole,
} from '@/lib/api';
import styles from './file-management.module.css';

const STATUS_FILTERS: Array<'all' | DocumentStatus> = ['all', 'PENDING', 'PROCESSING', 'READY', 'FAILED'];
const PAGE_SIZES = [10, 20, 50];
const ROLE_OPTIONS: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'NEW_HIRE'];

export default function FileManagementPage() {
  const router = useRouter();
  const me = useMe();
  const { showToast } = useToast();

  const [files, setFiles] = useState<DocumentResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isReprocessConfirmOpen, setIsReprocessConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  // 업로드 폼
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState<DocumentVisibility>('WORKSPACE');
  const [uploadRoles, setUploadRoles] = useState<WorkspaceRole[]>(['NEW_HIRE', 'MEMBER']);
  const [isUploading, setIsUploading] = useState(false);

  // AI 질문
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDocuments({
        page,
        size,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      const items = response.items ?? [];
      setFiles(items);
      setTotalElements(response.totalElements ?? 0);
      setTotalPages(response.totalPages ?? 0);
      // 고른 문서가 목록에 없으면 첫 문서로 옮긴다
      setSelectedId(prev => (prev && items.some(f => f.id === prev) ? prev : (items[0]?.id ?? null)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 목록을 불러오지 못했습니다.');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, size, statusFilter]);

  useEffect(() => {
    // 페이지/크기/상태가 바뀔 때마다 서버에서 다시 받아 온다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // 검색은 서버가 지원하지 않아 현재 페이지 안에서만 걸러 준다
  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return files;
    return files.filter(file => file.title.toLowerCase().includes(q));
  }, [files, searchQuery]);

  const currentFile = useMemo(
    () => files.find(file => file.id === selectedId) ?? null,
    [files, selectedId]
  );

  const getFileIcon = (file: DocumentResponse) => {
    const type = formatFileType(file.mimeType, file.title);
    if (type === 'PDF') return <FontAwesomeIcon icon={faFilePdf} className={styles.iconPdf} />;
    if (type === 'XLSX' || type === 'XLS' || type === 'CSV') {
      return <FontAwesomeIcon icon={faFileExcel} className={styles.iconExcel} />;
    }
    if (type === 'PPTX') return <FontAwesomeIcon icon={faFilePowerpoint} className={styles.iconPptx} />;
    return <FileText size={18} />;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'READY':
        return styles.statusReady;
      case 'PROCESSING':
        return styles.statusProcessing;
      case 'PENDING':
        return styles.statusPending;
      case 'FAILED':
        return styles.statusFailed;
      default:
        return styles.statusNeutral;
    }
  };

  const toggleChecked = (fileId: string) => {
    setCheckedIds(prev => (prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]));
  };

  const toggleUploadRole = (role: WorkspaceRole) => {
    setUploadRoles(prev => (prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]));
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      showToast('업로드할 파일을 선택해 주세요.', 'error');
      return;
    }
    if (uploadVisibility === 'RESTRICTED' && uploadRoles.length === 0) {
      showToast('역할별 공개는 허용 역할을 하나 이상 골라야 합니다.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      await uploadDocument({
        file: uploadFile,
        title: uploadTitle.trim() || undefined,
        visibility: uploadVisibility,
        allowedRoles: uploadVisibility === 'RESTRICTED' ? uploadRoles : undefined,
      });
      showToast('파일을 업로드했습니다. 학습이 끝나면 AI 답변에 사용됩니다.', 'success');
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setPage(0);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReprocess = async () => {
    if (!currentFile) return;
    setIsProcessingAction(true);
    try {
      await reprocessDocument(currentFile.id);
      showToast('문서 재처리를 시작했습니다.', 'success');
      setIsReprocessConfirmOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '문서 재처리에 실패했습니다.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDelete = async () => {
    if (!currentFile) return;
    setIsProcessingAction(true);
    try {
      await deleteDocument(currentFile.id);
      showToast('문서를 삭제했습니다.', 'success');
      setIsDeleteConfirmOpen(false);
      setCheckedIds(prev => prev.filter(id => id !== currentFile.id));
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '문서 삭제에 실패했습니다.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openAskModal = (file: DocumentResponse) => {
    setSelectedId(file.id);
    setQuestion(`${file.title} 문서에 대해 알려줘`);
    setAnswer(null);
    setCitations([]);
    setIsAskModalOpen(true);
  };

  const handleAsk = async () => {
    const text = question.trim();
    if (!text) {
      showToast('질문을 입력해 주세요.', 'error');
      return;
    }
    setIsAsking(true);
    try {
      const result = await sendChatMessage(text);
      setAnswer(result.answer);
      setCitations((result.citations ?? []).map(citationTitle));
      if (result.permissionDeniedDocumentIds?.length) {
        showToast('일부 문서는 권한이 없어 답변에 사용되지 않았습니다.', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '질문 전송에 실패했습니다.', 'error');
    } finally {
      setIsAsking(false);
    }
  };

  /**
   * 서버에 문서 처리 이력 API 가 없어,
   * 문서가 들고 있는 시각과 상태로 실제 진행 단계를 만들어 보여 준다.
   */
  const historySteps = useMemo(() => {
    if (!currentFile) return [];
    const steps: Array<{ title: string; subtext: string; time: string; color: string; icon: 'check' | 'gear' }> = [
      {
        title: '업로드 완료',
        subtext: '파일이 업로드되었습니다.',
        time: formatDateTime(currentFile.createdAt),
        color: '#287456',
        icon: 'check',
      },
    ];

    if (currentFile.status === 'PENDING') {
      steps.push({ title: '처리 대기', subtext: '학습 처리를 기다리고 있습니다.', time: '-', color: '#0765FC', icon: 'gear' });
    }
    if (currentFile.status === 'PROCESSING') {
      steps.push({ title: '처리 중', subtext: '문서를 학습하고 있습니다.', time: formatDateTime(currentFile.updatedAt), color: '#0765FC', icon: 'gear' });
    }
    if (currentFile.chunkCount !== null && currentFile.chunkCount !== undefined) {
      steps.push({
        title: '학습 조각 생성',
        subtext: `${currentFile.chunkCount}개의 학습 조각이 만들어졌습니다.`,
        time: formatDateTime(currentFile.updatedAt),
        color: '#287456',
        icon: 'check',
      });
    }
    if (currentFile.status === 'READY') {
      steps.push({
        title: '준비 완료',
        subtext: 'AI 답변에 사용할 수 있습니다.',
        time: formatDateTime(currentFile.updatedAt),
        color: '#287456',
        icon: 'check',
      });
    }
    if (currentFile.status === 'FAILED') {
      steps.push({
        title: '처리 실패',
        subtext: currentFile.errorMessage ?? '처리 중 오류가 발생했습니다.',
        time: formatDateTime(currentFile.updatedAt),
        color: '#985050',
        icon: 'gear',
      });
    }
    return steps;
  }, [currentFile]);

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
            <select
              className={styles.workspaceBtn}
              value={me?.currentWorkspace?.id ?? ''}
              onChange={(e) => {
                if (!e.target.value || e.target.value === me?.currentWorkspace?.id) return;
                saveWorkspaceId(e.target.value);
                window.location.reload();
              }}
              aria-label="업무 공간 전환"
            >
              {(me?.workspaces ?? []).map(workspace => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')} title="알림 센터">
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')} title="AI 질문">
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
                placeholder="현재 페이지에서 파일명 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button className={styles.uploadBtn} onClick={() => setIsUploadModalOpen(true)}>파일 업로드</button>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter}
                  className={`${styles.filterTag} ${statusFilter === filter ? styles.activeFilter : ''}`}
                  onClick={() => { setStatusFilter(filter); setPage(0); }}
                >
                  {filter === 'all' ? '전체' : getDisplayLabel(filter)}
                </button>
              ))}
              <div className={styles.docCount}>문서 {totalElements}개</div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <div className={styles.colCheckbox}>
                  <input
                    type="checkbox"
                    checked={filteredFiles.length > 0 && filteredFiles.every(f => checkedIds.includes(f.id))}
                    onChange={(e) =>
                      setCheckedIds(e.target.checked ? filteredFiles.map(f => f.id) : [])
                    }
                    aria-label="전체 선택"
                  />
                </div>
                <div className={styles.colName}>문서</div>
                <div className={styles.colStatus}>상태</div>
                <div className={styles.colScope}>공개 범위</div>
                <div className={styles.colRoles}>허용 역할</div>
                <div className={styles.colCheck}>학습 조각</div>
                <div className={styles.colUpdate}>업데이트</div>
                <div className={styles.colAction}>작업</div>
              </div>

              <div className={styles.tableBody}>
                {isLoading ? (
                  <div className={styles.footerNote}>불러오는 중...</div>
                ) : error ? (
                  <div className={styles.footerNote}>
                    {error}{' '}
                    <button className={styles.retryBtn} onClick={() => void load()}>다시 시도</button>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className={styles.footerNote}>
                    {searchQuery.trim() ? '검색 결과가 없습니다.' : '업로드된 문서가 없습니다.'}
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`${styles.tableRow} ${file.id === selectedId ? styles.selectedRow : ''}`}
                      onClick={() => setSelectedId(file.id)}
                    >
                      <div className={styles.colCheckbox}>
                        <input
                          type="checkbox"
                          checked={checkedIds.includes(file.id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleChecked(file.id)}
                          aria-label={`${file.title} 선택`}
                        />
                      </div>
                      <div className={styles.colName}>
                        <div className={styles.fileIcon}>{getFileIcon(file)}</div>
                        <span className={styles.fileName}>{file.title}</span>
                      </div>
                      <div className={styles.colStatus}>
                        <span className={`${styles.statusBadge} ${getStatusClass(file.status)}`}>
                          {getDisplayLabel(file.status)}
                        </span>
                      </div>
                      <div className={styles.colScope}>
                        {file.visibility ? getDisplayLabel(file.visibility) : '-'}
                      </div>
                      <div className={styles.colRoles}>
                        {file.allowedRoles?.length
                          ? file.allowedRoles.map(role => (
                              <span key={role} className={styles.roleBadge}>{getDisplayLabel(role)}</span>
                            ))
                          : '—'}
                      </div>
                      <div className={styles.colCheck}>{file.chunkCount ?? '—'}</div>
                      <div className={styles.colUpdate}>{formatDateTime(file.updatedAt ?? file.createdAt)}</div>
                      <div className={styles.colAction}>
                        {file.status === 'FAILED' ? (
                          <button
                            className={styles.retryBtn}
                            title="문서 재처리"
                            aria-label={`${file.title} 재처리`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(file.id);
                              setIsReprocessConfirmOpen(true);
                            }}
                          >
                            <RotateCcw size={16} />
                          </button>
                        ) : (
                          <button
                            className={styles.moreBtn}
                            title="파일 작업 열기"
                            aria-label={`${file.title} 작업 열기`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(file.id);
                              setIsActionsMenuOpen(true);
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <span className={styles.selectionInfo}>{checkedIds.length}개 선택됨</span>
              <select
                className={styles.pageSelect}
                value={size}
                onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
                aria-label="페이지 크기"
              >
                {PAGE_SIZES.map(value => (
                  <option key={value} value={value}>페이지당 {value}개</option>
                ))}
              </select>
              <div className={styles.pageNumbers}>
                <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                  <ChevronLeft size={16} />
                </button>
                <span className={styles.currentPage}>{totalPages === 0 ? 0 : page + 1} / {totalPages}</span>
                <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Footer Note */}
            <div className={styles.footerNote}>
              <span>업로드할 때 공개 범위와 허용 역할을 설정할 수 있으며, 실패한 문서는 다시 처리할 수 있습니다.</span>
            </div>
          </div>

          {/* Right Section - File Details */}
          <aside className={styles.rightSection}>
            {currentFile ? (
              <div className={styles.detailsCard}>
                <div className={styles.detailsHeader}>
                  <div className={styles.detailsTitle}>
                    <div className={styles.fileDetailsIcon}>{getFileIcon(currentFile)}</div>
                    <span>{currentFile.title}</span>
                  </div>
                  <span className={`${styles.detailsStatus} ${getStatusClass(currentFile.status)}`}>
                    {getDisplayLabel(currentFile.status)}
                  </span>
                </div>

                <div className={styles.detailsActions}>
                  <button className={styles.aiBtn} onClick={() => openAskModal(currentFile)}>
                    AI에게 질문
                  </button>
                  <button className={styles.menuBtn} onClick={() => setIsActionsMenuOpen(true)}>
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className={styles.detailsMeta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>문서 식별자</span>
                    <span className={styles.metaValue}>{currentFile.id}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>상태</span>
                    <span className={`${styles.metaValueStatus} ${getStatusClass(currentFile.status)}`}>
                      {getDisplayLabel(currentFile.status)}
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>공개 범위</span>
                    <span className={styles.metaValue}>
                      {currentFile.visibility ? getDisplayLabel(currentFile.visibility) : '-'}
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>허용 역할</span>
                    <div className={styles.metaValueRoles}>
                      {currentFile.allowedRoles?.length
                        ? currentFile.allowedRoles.map(role => (
                            <span key={role} className={styles.roleBadge}>{getDisplayLabel(role)}</span>
                          ))
                        : '—'}
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
                    <span className={styles.metaLabel}>등록일</span>
                    <span className={styles.metaValue}>{formatDateTime(currentFile.createdAt)}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>업데이트</span>
                    <span className={styles.metaValue}>{formatDateTime(currentFile.updatedAt)}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>파일 형식</span>
                    <span className={styles.metaValue}>
                      {formatFileType(currentFile.mimeType, currentFile.title)}
                      {currentFile.mimeType ? ` (${currentFile.mimeType})` : ''}
                    </span>
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
                  <button className={styles.rbacBtn} onClick={() => setIsHistoryPanelOpen(true)}>
                    <Lock size={16} /> 처리 이력
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.detailsCard}>
                <div className={styles.footerNote}>왼쪽에서 문서를 선택하면 상세 정보가 보입니다.</div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. 파일 업로드 */}
      {isUploadModalOpen && (
        <Modal
          open
          onClose={() => setIsUploadModalOpen(false)}
          title="파일 업로드"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsUploadModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton loading={isUploading} onClick={() => void handleUpload()}>
                <Cloud size={16} /> 업로드
              </ModalPrimaryButton>
            </>
          }
        >
          <label className={styles.uploadArea}>
            <Cloud size={48} color="#9CA3AF" />
            <p className={styles.uploadTitle}>
              {uploadFile ? uploadFile.name : '클릭해서 업로드할 파일을 고르세요'}
            </p>
            <p className={styles.uploadSubtitle}>PDF 문서, 워드 문서, 엑셀 문서, 프레젠테이션</p>
            <input
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                setUploadFile(picked);
                if (picked && !uploadTitle) setUploadTitle(picked.name);
              }}
            />
          </label>

          <div className={styles.formGroup}>
            <label className={styles.label}>문서명</label>
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="비워 두면 파일 이름을 사용합니다"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>공개 범위</label>
            <select
              value={uploadVisibility}
              onChange={(e) => setUploadVisibility(e.target.value as DocumentVisibility)}
              className={styles.select}
            >
              <option value="WORKSPACE">워크스페이스 전체</option>
              <option value="RESTRICTED">역할별 공개</option>
            </select>
          </div>

          {uploadVisibility === 'RESTRICTED' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>허용 역할</label>
              <div className={styles.rolesContainer}>
                {ROLE_OPTIONS.map((role) => (
                  <div key={role} className={styles.roleCheckbox}>
                    <input
                      type="checkbox"
                      id={`role-${role}`}
                      checked={uploadRoles.includes(role)}
                      onChange={() => toggleUploadRole(role)}
                    />
                    <label htmlFor={`role-${role}`} className={styles.roleLabel}>{getDisplayLabel(role)}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.footerNote}>
            공개 범위와 허용 역할은 업로드할 때만 정할 수 있습니다.
          </div>
        </Modal>
      )}

      {/* 2. AI 질문 */}
      {isAskModalOpen && currentFile && (
        <Modal
          open
          onClose={() => setIsAskModalOpen(false)}
          title="AI에게 질문"
          subtitle={currentFile.title}
          size="lg"
          closeOnBackdrop={!isAsking}
        >
          <div className={styles.chatContainer}>
            {answer && (
              <>
                <div className={styles.userMessage}>{question}</div>
                <div className={styles.aiMessage}>
                  <div className={styles.aiIcon}><Sparkles size={18} /></div>
                  <Markdown text={answer} />
                </div>
                {citations.length > 0 && (
                  <div className={styles.sources}>
                    <span>출처</span>
                    <div className={styles.sourceButtons}>
                      {citations.map((citation, index) => (
                        <span key={`${citation}-${index}`} className={styles.sourceBtn}>
                          <FileText size={14} /> {citation}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {isAsking && <div className={styles.chatTime}>답변을 만드는 중입니다...</div>}

            <div className={styles.followUpContainer}>
              <input
                type="text"
                placeholder="질문을 입력하세요"
                className={styles.followUpInput}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isAsking) void handleAsk(); }}
                disabled={isAsking}
              />
              <button className={styles.sendBtn} onClick={() => void handleAsk()} disabled={isAsking}>
                <Send size={16} />
              </button>
            </div>
          </div>

          <div className={styles.aiFooterButtons}>
            <button className={styles.aiFooterBtn} onClick={() => void handleAsk()} disabled={isAsking}>
              <RotateCcw size={14} /> 다시 질문
            </button>
            <button
              className={styles.aiFooterBtn}
              onClick={() => { setIsAskModalOpen(false); router.push(`/ai-chat?q=${encodeURIComponent(question)}`); }}
            >
              <MessageCircle size={14} /> AI 질문 화면으로 이동
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
          subtitle="문서를 다시 학습 처리합니다."
          size="sm"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsReprocessConfirmOpen(false)}>취소</ModalSecondaryButton>
              <ModalDangerButton loading={isProcessingAction} onClick={() => void handleReprocess()}>
                재처리 시작
              </ModalDangerButton>
            </>
          }
        >
          <div className={styles.confirmHeader}>
            <p>재처리를 시작하면 상태가 대기 중 → 처리 중으로 바뀌고,</p>
            <p>처리 결과에 따라 상태가 다시 갱신됩니다.</p>
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
              <ModalDangerButton loading={isProcessingAction} onClick={() => void handleDelete()}>
                삭제
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
            삭제하면 AI 답변에서 이 문서의 내용을 더 이상 사용하지 않습니다.
          </p>

          <div className={styles.deleteFileCard}>
            <FileText size={20} color="#DC2626" />
            <span>{currentFile.title}</span>
          </div>

          <p className={styles.deleteFootnote}>
            서버는 삭제 표시만 남기고 실제 파일은 보관합니다. 되돌리려면 관리자에게 문의해 주세요.
          </p>
        </Modal>
      )}

      {/* 5. 문서 접근 권한 (읽기 전용) */}
      {isPermissionModalOpen && currentFile && (
        <Modal
          open
          onClose={() => setIsPermissionModalOpen(false)}
          title="문서 접근 권한"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsPermissionModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setIsPermissionModalOpen(false);
                  setIsUploadModalOpen(true);
                }}
              >
                새 설정으로 업로드
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
            <div className={styles.metaValue}>
              {currentFile.visibility ? getDisplayLabel(currentFile.visibility) : '-'}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>허용 역할</label>
            <div className={styles.selectedRoles}>
              {currentFile.allowedRoles?.length
                ? currentFile.allowedRoles.map(role => (
                    <span key={role} className={styles.roleTag}>{getDisplayLabel(role)}</span>
                  ))
                : <span className={styles.metaValue}>{getDisplayLabels(currentFile.allowedRoles)}</span>}
            </div>
          </div>

          <div className={styles.footerNote}>
            서버에 문서 권한 수정 API가 없어 여기서는 바꿀 수 없습니다. 권한을 바꾸려면 새 설정으로 다시 업로드해 주세요.
          </div>
        </Modal>
      )}

      {/* 6. 파일 작업 메뉴 */}
      {isActionsMenuOpen && currentFile && (
        <div className={styles.menuOverlay} onClick={() => setIsActionsMenuOpen(false)}>
          <div className={styles.actionMenu} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.actionMenuItem}
              onClick={() => { setIsHistoryPanelOpen(true); setIsActionsMenuOpen(false); }}
            >
              <FileText size={16} /> 처리 이력 보기
            </button>
            <button
              className={styles.actionMenuItem}
              onClick={() => { setIsPermissionModalOpen(true); setIsActionsMenuOpen(false); }}
            >
              <Lock size={16} /> 접근 권한 확인
            </button>
            <button
              className={styles.actionMenuItem}
              onClick={() => { openAskModal(currentFile); setIsActionsMenuOpen(false); }}
            >
              <MessageCircle size={16} /> AI에게 질문
            </button>
            <button
              className={styles.actionMenuItem}
              onClick={() => { setIsReprocessConfirmOpen(true); setIsActionsMenuOpen(false); }}
            >
              <RotateCcw size={16} /> 문서 재처리
            </button>
            <button
              className={styles.actionMenuItemDanger}
              onClick={() => { setIsDeleteConfirmOpen(true); setIsActionsMenuOpen(false); }}
            >
              <Trash2 size={16} /> 문서 삭제
            </button>
          </div>
        </div>
      )}

      {/* 7. 처리 이력 패널 */}
      {isHistoryPanelOpen && currentFile && (
        <div className={styles.sidePanelOverlay} onClick={() => setIsHistoryPanelOpen(false)}>
          <div className={styles.sidePanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sidePanelHeader}>
              <h2>처리 이력</h2>
              <button
                onClick={() => setIsHistoryPanelOpen(false)}
                className={styles.sidePanelCloseBtn}
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.sidePanelBody}>
              <div className={styles.timeline}>
                {historySteps.map((step) => (
                  <div key={step.title} className={styles.timelineItem}>
                    <div className={styles.timelineIcon} style={{ backgroundColor: step.color }}>
                      {step.icon === 'check' ? <Check size={14} /> : <Settings size={14} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <p className={styles.timelineTitle}>{step.title}</p>
                      <p className={styles.timelineSubtext}>{step.subtext}</p>
                      <p className={styles.timelineTime}>{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
