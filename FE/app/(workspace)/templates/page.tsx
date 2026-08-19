'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Search, MoreVertical } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import { getTemplates, createTemplateAPI, deleteTemplate } from '@/lib/api';
import styles from './templates.module.css';

export default function TemplatesPage() {
  const router = useRouter();
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  // Form states for creation
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateRole, setNewTemplateRole] = useState('NEW_HIRE');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  // Load templates on mount
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await getTemplates();
      setTemplates(response.items || []);
      if (response.items && response.items.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(response.items[0].id);
      }
    } catch (err) {
      console.error('템플릿 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      showToast('템플릿명을 입력해주세요.', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await createTemplateAPI({ name: newTemplateName.trim() });
      showToast(`'${newTemplateName}' 템플릿을 생성했습니다.`, 'success');
      setNewTemplateName('');
      setNewTemplateDesc('');
      setIsCreationModalOpen(false);
      await loadTemplates();
    } catch (err: any) {
      showToast(err.message || '템플릿 생성 실패', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      setIsSubmitting(true);
      await deleteTemplate(selectedTemplateId);
      showToast('템플릿을 삭제했습니다.', 'success');
      setIsStatusModalOpen(false);
      setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplateId));
      setSelectedTemplateId(null);
    } catch (err: any) {
      showToast(err.message || '템플릿 삭제 실패', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const activeCount = templates.length;
  const roleCount = new Set(templates.map(t => t.role)).size || 1;

  return (
    <div className={styles.container}>
      <CommonSidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div><h1>온보딩 템플릿</h1><p>역할별 30 일 인수인계 구성을 템플릿으로 관리하세요.</p></div>
          <button className={styles.createBtn} onClick={() => setIsCreationModalOpen(true)}><Plus size={16} /> 템플릿 생성</button>
        </header>

        <div className={styles.content}>
          <div className={styles.statsWrapper}>
            <div><div>{activeCount}</div><div>개</div><div>활성 템플릿 수</div></div>
            <div><div>{roleCount}</div><div>개</div><div>다양한 역할 템플릿</div></div>
            <div><div>{templates.reduce((acc, t) => acc + (t.items || t.itemCount || 0), 0)}</div><div>개</div><div>모든 템플릿 항목 수</div></div>
            <div><div>{templates.filter(t => t.status === 'ACTIVE' || !t.status).length}</div><div>개</div><div>사용 중인 템플릿</div></div>
          </div>

          <div className={styles.mainLayout}>
            <div className={styles.listCard}>
            <h2>템플릿 목록</h2>
            <div className={styles.templates}>
              {templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                  등록된 템플릿이 없습니다.
                </div>
              ) : (
                templates.map(t => (
                  <div key={t.id} className={`${styles.template} ${t.id === selectedTemplateId ? styles.selected : ''}`} onClick={() => setSelectedTemplateId(t.id)}>
                    <div className={styles.info}>
                      <div className={styles.name}>{t.name} <span className={styles.role}>{t.role || 'NEW_HIRE'}</span> <span className={styles.status}>{t.status || 'ACTIVE'}</span></div>
                      <div className={styles.meta}>{t.items ?? t.itemCount ?? 0}개 항목 · {t.team || '전체'}</div>
                      <div className={styles.date}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</div>
                    </div>
                    <button className={styles.menu} onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplateId(t.id);
                      setIsActionsMenuOpen(true);
                    }}><MoreVertical size={16} /></button>
                  </div>
                ))
              )}
            </div>
            <button className={styles.addMore} onClick={() => setIsCreationModalOpen(true)}><Plus size={16} /> 템플릿 생성</button>
          </div>

            <aside className={styles.details}>
              <button className={styles.preview} onClick={() => setIsDetailsModalOpen(true)}>미리보기</button>
              {selectedTemplate && (
                <>
                  <h3>{selectedTemplate.name}</h3>
                  <div className={styles.badge}>{selectedTemplate.role || 'NEW_HIRE'}</div>
                  <div className={styles.green}>{selectedTemplate.status || 'ACTIVE'}</div>
                  <p className={styles.desc}>{selectedTemplate.team || '온보딩 표준'}<br/>등록일: {selectedTemplate.createdAt ? new Date(selectedTemplate.createdAt).toLocaleDateString() : '-'}</p>
                  <div className={styles.actions}>
                    <button onClick={() => setIsCategoriesModalOpen(true)}><Edit2 size={16} /> 카테고리 보기</button>
                    <button className={styles.delete} onClick={() => setIsStatusModalOpen(true)}><Trash2 size={16} /> 삭제</button>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. Template Creation Modal */}
      {isCreationModalOpen && (
        <Modal
          open
          onClose={() => setIsCreationModalOpen(false)}
          title="템플릿 생성"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsCreationModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isSubmitting}
                onClick={handleCreateTemplate}
              >
                생성
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>템플릿명</label>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="예: 백엔드 개발자 30일 인수인계 템플릿"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>대상 역할</label>
            <select
              value={newTemplateRole}
              onChange={(e) => setNewTemplateRole(e.target.value)}
              className={styles.select}
            >
              <option value="NEW_HIRE">NEW_HIRE (신규 입사자)</option>
              <option value="MEMBER">MEMBER (일반 팀원)</option>
              <option value="MANAGER">MANAGER (온보딩 매니저)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>설명</label>
            <textarea
              value={newTemplateDesc}
              onChange={(e) => setNewTemplateDesc(e.target.value)}
              placeholder="템플릿에 대한 간단한 설명을 입력하세요."
              className={styles.textarea}
              rows={3}
            />
          </div>
        </Modal>
      )}

      {/* 2. Template List Modal */}
      {isListModalOpen && (
        <Modal
          open
          onClose={() => setIsListModalOpen(false)}
          title="템플릿 목록"
        >
          <div className={styles.searchBox}>
            <Search size={16} />
            <input type="text" placeholder="템플릿 검색" />
          </div>
          {templates.map(t => (
            <div key={t.id} className={styles.templateItem}>
              <div>{t.name} - {t.role}</div>
              <span>{t.status}</span>
            </div>
          ))}
        </Modal>
      )}

      {/* 3. Template Details Modal */}
      {isDetailsModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsDetailsModalOpen(false)}
          title={selectedTemplate.name}
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDetailsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  router.push('/30day-plan');
                }}
              >
                30일 계획에서 확인
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.detail}><strong>역할:</strong> {selectedTemplate.role || 'NEW_HIRE'}</div>
          <div className={styles.detail}><strong>상태:</strong> {selectedTemplate.status || 'ACTIVE'}</div>
          <div className={styles.detail}><strong>항목 수:</strong> {selectedTemplate.items ?? selectedTemplate.itemCount ?? 0}개</div>
          <div className={styles.detail}><strong>설명:</strong> {selectedTemplate.description || '표준 온보딩 템플릿'}</div>
        </Modal>
      )}

      {/* 4. Template Categories Modal */}
      {isCategoriesModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsCategoriesModalOpen(false)}
          title="카테고리 관리"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsCategoriesModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  showToast('카테고리 설정이 저장되었습니다.', 'success');
                  setIsCategoriesModalOpen(false);
                }}
              >
                확인
              </ModalPrimaryButton>
            </>
          }
        >
          {['회사 및 조직 이해', '실무 업무 프로세스', '주요 툴 및 개발 환경', '주요 담당 프로젝트', '사내 커뮤니케이션 가이드', '첫 주차 필수 체크리스트'].map((cat, i) => (
            <div key={i} className={styles.categoryItem}>
              <span>{i + 1}. {cat}</span>
              <button className={styles.editBtn} onClick={() => showToast(`'${cat}' 카테고리 정보입니다.`, 'info')}><Edit2 size={14} /></button>
            </div>
          ))}
        </Modal>
      )}

      {/* 5. Template Members Modal */}
      {isMembersModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsMembersModalOpen(false)}
          title="템플릿 대상 멤버"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsMembersModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setIsMembersModalOpen(false);
                  router.push('/members');
                }}
              >
                구성원 관리로 이동
              </ModalPrimaryButton>
            </>
          }
        >
          <p style={{ fontSize: '14px', color: '#4B5563', margin: '0 0 12px' }}>
            해당 템플릿의 대상 역할(<strong>{selectedTemplate.role || 'NEW_HIRE'}</strong>)을 부여받은 구성원 목록입니다.
          </p>
          <div className={styles.memberList}>
            <div className={styles.member}>신규 입사자 구성원 그룹 ({selectedTemplate.role || 'NEW_HIRE'})</div>
          </div>
        </Modal>
      )}

      {/* 6. Template Status Modal */}
      {isStatusModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsStatusModalOpen(false)}
          title="템플릿 삭제"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsStatusModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalDangerButton
                loading={isSubmitting}
                onClick={handleDeleteTemplate}
              >
                삭제
              </ModalDangerButton>
            </>
          }
        >
          <p>'{selectedTemplate.name}'을(를) 삭제하시겠습니까?</p>
        </Modal>
      )}

      {/* 7. Template Actions Menu */}
      {isActionsMenuOpen && selectedTemplate && (
        <div className={styles.menuOverlay} onClick={() => setIsActionsMenuOpen(false)}>
          <div className={styles.actionMenu} onClick={(e) => e.stopPropagation()}>
            <button className={styles.actionItem} onClick={() => { setIsDetailsModalOpen(true); setIsActionsMenuOpen(false); }}>상세 보기</button>
            <button className={styles.actionItem} onClick={() => { setIsCategoriesModalOpen(true); setIsActionsMenuOpen(false); }}>카테고리 편집</button>
            <button className={styles.actionItem} onClick={() => { setIsMembersModalOpen(true); setIsActionsMenuOpen(false); }}>멤버 관리</button>
            <button className={styles.actionItem} onClick={() => { setIsStatusModalOpen(true); setIsActionsMenuOpen(false); }}>삭제</button>
          </div>
        </div>
      )}
    </div>
  );
}
