'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, MoreVertical, RotateCcw, ChevronLeft, ChevronRight, Bell, HelpCircle, X, Cloud, AlertTriangle, Trash2, FileText, Lock, Share2, MessageCircle, Sparkles, Send, Check, Settings } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel, faFilePowerpoint } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { getDocuments, deleteDocument } from '@/lib/document';
import { useToast } from '@/components/ui/toast';
import { getWorkspaceId } from '@/lib/storage';
import styles from './file-management.module.css';

export default function FileManagementPage() {
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReprocessConfirmOpen, setIsReprocessConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isRbacSidePanelOpen, setIsRbacSidePanelOpen] = useState(false);

  // Upload form states
  const [uploadFileName, setUploadFileName] = useState('행사운영가이드');
  const [uploadScope, setUploadScope] = useState('WORKSPACE');
  const [uploadRoles, setUploadRoles] = useState(['NEW_HIRE']);
  const [uploadDescription, setUploadDescription] = useState('');

  // Metadata form states
  const [metadataScope, setMetadataScope] = useState('WORKSPACE');
  const [metadataRoles, setMetadataRoles] = useState(['NEW_HIRE', 'MEMBER']);
  const [metadataTags, setMetadataTags] = useState('');
  const [metadataDescription, setMetadataDescription] = useState('');

  // Load files on mount
  useEffect(() => {
    const loadFiles = async () => {
      try {
        setIsLoading(true);
        const wsId = getWorkspaceId();
        if (!wsId) throw new Error('워크스페이스 ID 없음');
        const response = await getDocuments(wsId);
        setFiles(response.content || []);
      } catch (err) {
        console.error('파일 목록 로드 실패:', err);
        showToast('파일 목록을 불러올 수 없습니다', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadFiles();
  }, []);

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
            <select className={styles.workspaceBtn}>
              <option>마케팅팀 인수인계</option>
            </select>
            <button className={styles.notifBtn}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn}>
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
                        {getFileIcon(file.type)}
                      </div>
                      <span className={styles.fileName}>{file.name}</span>
                    </div>
                    <div className={styles.colStatus}>
                      <span
                        className={styles.statusBadge}
                        style={{ color: getStatusColor(file.status) }}
                      >
                        {file.status}
                      </span>
                    </div>
                    <div className={styles.colScope}>{file.scope}</div>
                    <div className={styles.colRoles}>
                      {file.roles.map((role, i) => (
                        <span key={i} className={styles.roleBadge}>{role}</span>
                      ))}
                    </div>
                    <div className={styles.colCheck}>{file.checkCount || '—'}</div>
                    <div className={styles.colUpdate}>{file.date}</div>
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
                      {getFileIcon(currentFile.type)}
                    </div>
                    <span>{currentFile.name}</span>
                  </div>
                  <span
                    className={styles.detailsStatus}
                    style={{ color: getStatusColor(currentFile.status) }}
                  >
                    {currentFile.status}
                  </span>
                </div>

                <div className={styles.detailsActions}>
                  <button className={styles.aiBtn} onClick={() => setIsDetailsModalOpen(true)}>
                    AI에게 질문
                  </button>
                  <button className={styles.downloadBtn}>
                    <Download size={16} /> 다운로드
                  </button>
                  <button className={styles.menuBtn} onClick={() => setIsActionsMenuOpen(true)}>
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className={styles.detailsMeta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>문서 ID</span>
                    <span className={styles.metaValue}>{currentFile.docId}</span>
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
                    <span className={styles.metaValue}>{currentFile.scope}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>허용 역할</span>
                    <div className={styles.metaValueRoles}>
                      {currentFile.roles.map((role, i) => (
                        <span key={i} className={styles.roleBadge}>{role}</span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>체크 수</span>
                    <span className={styles.metaValue}>{currentFile.checkCount || '—'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>파일 크기</span>
                    <span className={styles.metaValue}>{currentFile.size}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>업데이트</span>
                    <span className={styles.metaValue}>{currentFile.updatedAt}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>업로더</span>
                    <span className={styles.metaValue}>{currentFile.uploader}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>설명</span>
                    <span className={styles.metaValue}>{currentFile.description}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>태그</span>
                    <div className={styles.metaValueTags}>
                      {currentFile.tags.map((tag, i) => (
                        <span key={i} className={styles.tagBadge}>{tag}</span>
                      ))}
                    </div>
                  </div>
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
                loading={isPending('file-management-0')}
                onClick={() => run('file-management-0', '파일을 업로드했습니다.', () => setIsUploadModalOpen(false))}
              >
                <Cloud size={16} /> 업로드
              </ModalPrimaryButton>
            </>
          }
        >
          {/* Drag and Drop Area */}
          <div className={styles.uploadArea}>
            <Cloud size={48} color="#9CA3AF" />
            <p className={styles.uploadTitle}>파일을 드래그 앤 드롭하거나 클릭하여 업로드</p>
            <p className={styles.uploadSubtitle}>PDF, DOCX, XLSX, PPTX</p>
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
              <option value="WORKSPACE">WORKSPACE</option>
              <option value="ROLE_BASED">ROLE_BASED</option>
              <option value="PRIVATE">PRIVATE</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>허용 역할</label>
            <div className={styles.rolesContainer}>
              {['NEW_HIRE', 'MEMBER'].map((role) => (
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

          <div className={styles.formGroup}>
            <label className={styles.label}>설명 (선택)</label>
            <textarea
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="문서에 대한 설명을 입력하세요."
              className={styles.textarea}
              rows={4}
            />
            <span className={styles.charCount}>0 / 500</span>
          </div>
        </Modal>
      )}

      {/* 2. AI Question Modal (File Details) */}
      {isDetailsModalOpen && currentFile && (
        <Modal
          open
          onClose={() => setIsDetailsModalOpen(false)}
          title="AI에게 질문"
        >
          <div className={styles.chatContainer}>
            {/* Chat message from user */}
            <div className={styles.chatTime}>10:24</div>
            <div className={styles.userMessage}>
              {currentFile.name}은 인제 창조된 됐?
            </div>

            {/* Chat message from AI */}
            <div className={styles.chatTime}>10:24</div>
            <div className={styles.aiMessage}>
              <div className={styles.aiIcon}><Sparkles size={18} /></div>
              <p>{currentFile.name}은 행사 기획 단계에서 중요한 참고 자료입니다. 또한 행사 주최자 작성 시, 미팅 운영 정책 적 작성 시, 미팅 참석자 현황 시, 중요 정책 및 보고서 작성 시 인도시 필수 메뉴입니다.</p>
            </div>

            {/* Sources */}
            <div className={styles.sources}>
              <span>출처</span>
              <div className={styles.sourceButtons}>
                <button className={styles.sourceBtn}>
                  <FileText size={14} /> {currentFile.name}.pdf - p.3
                </button>
                <button className={styles.sourceBtn}>
                  <FileText size={14} /> {currentFile.name}.pdf - p.5
                </button>
              </div>
            </div>

            {/* Follow-up question */}
            <div className={styles.followUpContainer}>
              <input
                type="text"
                placeholder="추기 질문을 입력하세요"
                className={styles.followUpInput}
              />
              <button className={styles.sendBtn}><Send size={16} /></button>
            </div>
          </div>

          <div className={styles.aiFooterButtons}>
            <button className={styles.aiFooterBtn}>
              <RotateCcw size={14} /> 재 질문
            </button>
            <button className={styles.aiFooterBtn}>
              <Share2 size={14} /> 진 채팅으로 이동
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
                loading={isPending('file-management-1')}
                onClick={() => run('file-management-1', '문서 재처리를 시작했습니다.', () => setIsReprocessConfirmOpen(false))}
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
              <span>{currentFile.name}</span>
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
            &apos;{currentFile.name}&apos;을 삭제하시겠습니까?
          </p>
          <p className={styles.deleteSubtext}>
            이 문서는 휴지통으로 이동되며, AI 답변에 담긴 내용은 더 이상 제공되지 않습니다.
          </p>

          <div className={styles.deleteFileCard}>
            <FileText size={20} color="#DC2626" />
            <span>{currentFile.name}</span>
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
            <span>{currentFile.name}</span>
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
