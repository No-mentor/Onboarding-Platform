'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, BarChart3, Bell, Building2, Check, ChevronDown, Copy, FileText, Grid2X2, HelpCircle, LockKeyhole, Pencil, Settings, Trash2, Users } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useMe } from '@/components/require-workspace';
import { saveWorkspaceId } from '@/lib/storage';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  getDocuments,
  getMembers,
  getTemplates,
  updateWorkspace,
  type DocumentResponse,
  type MemberResponse,
} from '@/lib/api';
import styles from './workspace-settings.module.css';

/** 워크스페이스 이름을 바꿀 수 있는 역할 */
const ADMIN_ROLES = new Set(['OWNER', 'ADMIN']);

export default function WorkspaceSettingsPage() {
  const me = useMe();
  const { showToast } = useToast();

  const workspace = me?.currentWorkspace ?? null;
  const canEdit = ADMIN_ROLES.has(workspace?.role ?? '');

  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [documentTotal, setDocumentTotal] = useState(0);
  const [templateCount, setTemplateCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isDocumentStatusOpen, setIsDocumentStatusOpen] = useState(false);
  const [isDangerNoticeOpen, setIsDangerNoticeOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // 요약 숫자는 각각 다른 API 라 함께 받아 온다. 권한이 없는 항목은 건너뛴다.
      const [memberResult, documentResult, templateResult] = await Promise.all([
        getMembers(0, 100).catch(() => null),
        getDocuments({ page: 0, size: 100 }).catch(() => null),
        getTemplates().catch(() => null),
      ]);
      setMembers(memberResult?.items ?? []);
      setDocuments(documentResult?.items ?? []);
      setDocumentTotal(documentResult?.totalElements ?? 0);
      setTemplateCount(templateResult?.items.length ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const owner = useMemo(() => members.find(member => member.role === 'OWNER') ?? null, [members]);

  const documentStatusCounts = useMemo(
    () => ({
      READY: documents.filter(doc => doc.status === 'READY').length,
      PROCESSING: documents.filter(doc => doc.status === 'PROCESSING').length,
      PENDING: documents.filter(doc => doc.status === 'PENDING').length,
      FAILED: documents.filter(doc => doc.status === 'FAILED').length,
    }),
    [documents]
  );

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label}을(를) 복사했습니다.`, 'success');
    } catch {
      showToast('복사하지 못했습니다.', 'error');
    }
  };

  const openInfoModal = () => {
    setDraftName(workspace?.name ?? '');
    setIsInfoOpen(true);
  };

  const saveInfo = async () => {
    if (!workspace) return;
    if (!draftName.trim()) {
      showToast('워크스페이스 이름을 입력해 주세요.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await updateWorkspace(workspace.id, draftName.trim());
      showToast('워크스페이스 이름을 저장했습니다.', 'success');
      setIsInfoOpen(false);
      // /auth/me 를 다시 받아야 화면 전체 이름이 갱신된다
      window.location.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '정보 저장에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.layout}>
      <CommonSidebar />
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <div className={styles.titleRow}><h1>워크스페이스</h1><Settings size={25} /></div>
            <p>워크스페이스 정보와 구성 현황을 확인하세요.</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.workspaceMenuWrap}>
              <button
                className={styles.workspaceSelector}
                onClick={() => setWorkspaceMenuOpen((open) => !open)}
                aria-expanded={workspaceMenuOpen}
              >
                <Building2 size={16} />
                <span>{workspace?.name ?? '업무 공간'}</span>
                <ChevronDown size={16} />
              </button>
              {workspaceMenuOpen && (
                <div className={styles.workspaceMenu}>
                  {(me?.workspaces ?? []).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setWorkspaceMenuOpen(false);
                        if (item.id === workspace?.id) return;
                        saveWorkspaceId(item.id);
                        window.location.reload();
                      }}
                    >
                      <span>{item.name}</span>
                      {item.id === workspace?.id && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className={styles.roundButton}
              aria-label="문서 처리 현황"
              onClick={() => setIsDocumentStatusOpen(true)}
            >
              <Bell size={19} />
            </button>
            <button
              className={styles.roundButton}
              aria-label="도움말"
              onClick={() => showToast('워크스페이스 이름은 소유자와 관리자만 바꿀 수 있습니다.', 'success')}
            >
              <HelpCircle size={19} />
            </button>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryIcon}><Building2 /></span>
              <div><small>워크스페이스 이름</small><strong>{workspace?.name ?? '-'}</strong></div>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryIcon}><Users /></span>
              <div><small>멤버 수</small><strong>{isLoading ? '—' : members.length}<em>명</em></strong></div>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryIcon}><FileText /></span>
              <div><small>문서 수</small><strong>{isLoading ? '—' : documentTotal}<em>개</em></strong></div>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryIcon}><Grid2X2 /></span>
              <div><small>템플릿</small><strong>{isLoading ? '—' : templateCount}<em>개</em></strong></div>
            </div>
          </section>

          <div className={styles.settingsGrid}>
            <section className={`${styles.card} ${styles.basicCard}`}>
              <h2>기본 정보</h2>
              <div className={styles.basicBody}>
                <div className={styles.workspaceLogo} style={{ backgroundColor: '#0765FC' }}>
                  <BarChart3 size={44} />
                </div>
                <dl className={styles.infoList}>
                  <div><dt>워크스페이스 이름</dt><dd>{workspace?.name ?? '-'}</dd></div>
                  <div><dt>내 역할</dt><dd>{workspace ? getDisplayLabel(workspace.role) : '-'}</dd></div>
                  <div>
                    <dt>소유자</dt>
                    <dd>{owner ? `${owner.name} (${owner.email})` : isLoading ? '불러오는 중...' : '확인할 수 없음'}</dd>
                  </div>
                  <div>
                    <dt>워크스페이스 ID</dt>
                    <dd>
                      {workspace?.id ?? '-'}
                      {workspace && (
                        <button onClick={() => void copyText(workspace.id, '워크스페이스 ID')} aria-label="워크스페이스 ID 복사">
                          <Copy size={15} />
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>슬러그</dt>
                    <dd>
                      {workspace?.slug ?? '-'}
                      {workspace && (
                        <button onClick={() => void copyText(workspace.slug, '슬러그')} aria-label="슬러그 복사">
                          <Copy size={15} />
                        </button>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className={styles.cardActions}>
                <button onClick={openInfoModal} disabled={!canEdit}>
                  <Pencil size={16} /> 이름 수정
                </button>
              </div>
            </section>

            <div className={styles.sideCards}>
              <section className={styles.card}>
                <h2>구성원 현황</h2>
                <dl className={styles.compactList}>
                  <div><dt>전체 멤버</dt><dd>{members.length}명</dd></div>
                  <div><dt>신입 구성원</dt><dd>{members.filter(m => m.role === 'NEW_HIRE').length}명</dd></div>
                  <div><dt>구성원</dt><dd>{members.filter(m => m.role === 'MEMBER').length}명</dd></div>
                  <div><dt>관리 담당자</dt><dd>{members.filter(m => m.role === 'MANAGER').length}명</dd></div>
                  <div>
                    <dt>관리자 · 소유자</dt>
                    <dd>{members.filter(m => m.role === 'ADMIN' || m.role === 'OWNER').length}명</dd>
                  </div>
                  <div>
                    <dt>비활성 계정</dt>
                    <dd className={styles.activeText}>{members.filter(m => m.status === 'DISABLED').length}명</dd>
                  </div>
                </dl>
                <button className={styles.outlineAction} onClick={() => setIsDocumentStatusOpen(true)}>
                  <LockKeyhole size={16} /> 문서 처리 현황
                </button>
              </section>

              <section className={styles.card}>
                <h2>문서 처리 현황</h2>
                <div className={styles.notificationPreview}>
                  <div>
                    <span><FileText size={17} />준비 완료</span>
                    <span className={styles.tag}>{documentStatusCounts.READY}개</span>
                  </div>
                  <div>
                    <span><FileText size={17} />처리 중</span>
                    <span className={styles.tag}>{documentStatusCounts.PROCESSING + documentStatusCounts.PENDING}개</span>
                  </div>
                  <div>
                    <span><AlertTriangle size={17} />처리 실패</span>
                    <span className={styles.tag}>{documentStatusCounts.FAILED}개</span>
                  </div>
                </div>
                <button className={styles.outlineAction} onClick={() => setIsDocumentStatusOpen(true)}>
                  <Bell size={16} /> 자세히 보기
                </button>
              </section>
            </div>
          </div>

          <section className={styles.dangerZone}>
            <div>
              <h2>위험 작업</h2>
              <p>워크스페이스 보관과 삭제는 서버에 해당 API가 없어 아직 지원하지 않습니다.</p>
            </div>
            <div>
              <button className={styles.archiveButton} onClick={() => setIsDangerNoticeOpen(true)}>
                <Archive size={16} /> 워크스페이스 보관
              </button>
              <button className={styles.deleteButton} onClick={() => setIsDangerNoticeOpen(true)}>
                <Trash2 size={16} /> 워크스페이스 삭제
              </button>
            </div>
          </section>
        </div>
      </main>

      <Modal
        open={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="워크스페이스 이름 수정"
        footer={
          <>
            <ModalSecondaryButton onClick={() => setIsInfoOpen(false)}>취소</ModalSecondaryButton>
            <ModalPrimaryButton loading={isSaving} onClick={() => void saveInfo()}>저장하기</ModalPrimaryButton>
          </>
        }
      >
        <div className={styles.formStack}>
          <label>
            워크스페이스 이름
            <input value={draftName} onChange={(event) => setDraftName(event.target.value)} autoFocus />
          </label>
          <label>
            슬러그 (변경 불가)
            <input value={workspace?.slug ?? ''} readOnly />
          </label>
          <label>
            워크스페이스 ID
            <input value={workspace?.id ?? ''} readOnly />
          </label>
        </div>
        <p className={styles.modalHint}>서버는 이름 변경만 지원합니다. 슬러그와 ID는 만든 뒤에 바꿀 수 없습니다.</p>
      </Modal>

      <Modal
        open={isDocumentStatusOpen}
        onClose={() => setIsDocumentStatusOpen(false)}
        title="문서 처리 현황"
        subtitle={`최근 문서 ${documents.length}개 기준`}
        footer={<ModalSecondaryButton onClick={() => setIsDocumentStatusOpen(false)}>닫기</ModalSecondaryButton>}
      >
        <div className={styles.notificationModalList}>
          {(['READY', 'PROCESSING', 'PENDING', 'FAILED'] as const).map((status) => (
            <div key={status}>
              <FileText size={20} />
              <span>
                <strong>{getDisplayLabel(status)}</strong>
                <small>{documentStatusCounts[status]}개</small>
              </span>
            </div>
          ))}
        </div>
        {documentStatusCounts.FAILED > 0 && (
          <p className={styles.modalHint}>
            처리에 실패한 문서는 파일 탐색 화면에서 다시 처리할 수 있습니다.
          </p>
        )}
      </Modal>

      <Modal
        open={isDangerNoticeOpen}
        onClose={() => setIsDangerNoticeOpen(false)}
        title="아직 지원하지 않는 작업"
        footer={<ModalSecondaryButton onClick={() => setIsDangerNoticeOpen(false)}>닫기</ModalSecondaryButton>}
      >
        <div className={styles.confirmBody}>
          <span className={styles.warningIcon}><AlertTriangle size={32} /></span>
          <h3>워크스페이스 보관·삭제 API가 아직 없습니다.</h3>
          <p>
            서버에는 워크스페이스 생성·이름 수정·조회만 있습니다. 실제로 지우려면 관리자에게 문의해 주세요.
          </p>
        </div>
      </Modal>
    </div>
  );
}
