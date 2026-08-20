'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Search, MoreVertical, LayoutTemplate, UsersRound, FileText, CircleCheck, Crown } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  createTemplate,
  deleteTemplate,
  getMembers,
  getTemplates,
  updateTemplate,
  type MemberResponse,
  type TemplateItemResponse,
  type TemplateResponse,
  type WorkspaceRole,
} from '@/lib/api';
import styles from './templates.module.css';

/** 서버가 주는 Instant 를 '수정일 2026. 05. 13' 형태로 */
function formatUpdatedAt(value: string | null): string {
  if (!value) return '수정일 정보 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '수정일 정보 없음';
  return `수정일 ${date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}`;
}

/**
 * 서버 템플릿에는 카테고리 개념이 없다.
 * 항목의 종류(PlanItemType)별로 묶어 카테고리처럼 보여 준다.
 */
function categoriesOf(items: TemplateItemResponse[] | null): Array<{ name: string; itemCount: number }> {
  const counts = new Map<string, number>();
  for (const item of items ?? []) {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }
  return [...counts.entries()].map(([type, itemCount]) => ({
    name: getDisplayLabel(type),
    itemCount,
  }));
}

/** 권장 기간은 항목의 가장 큰 dayIndex 로 계산한다 */
function durationOf(items: TemplateItemResponse[] | null): number {
  return (items ?? []).reduce((max, item) => Math.max(max, item.dayIndex), 0);
}

const ROLE_OPTIONS: WorkspaceRole[] = ['NEW_HIRE', 'MEMBER', 'MANAGER'];

export default function TemplatesPage() {
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // 생성 폼
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<WorkspaceRole>('NEW_HIRE');
  const [newDescription, setNewDescription] = useState('');

  // 편집 폼
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<WorkspaceRole>('NEW_HIRE');
  const [editDescription, setEditDescription] = useState('');

  // 템플릿 대상 역할의 멤버
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  const [keyword, setKeyword] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTemplates();
      const list = response.items ?? [];
      setTemplates(list);
      // 목록이 바뀌어도 고른 템플릿이 남아 있으면 유지한다
      setSelectedTemplateId(prev =>
        prev && list.some(t => t.id === prev) ? prev : (list[0]?.id ?? null)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '템플릿 목록을 불러오지 못했습니다.');
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const stats = useMemo(() => {
    const roles = new Set(templates.map(t => t.targetRole).filter(Boolean));
    return {
      total: templates.length,
      roleCount: roles.size,
      itemCount: templates.reduce((sum, t) => sum + (t.items?.length ?? 0), 0),
      defaultCount: templates.filter(t => t.isDefault).length,
    };
  }, [templates]);

  const visibleTemplates = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(t => t.name.toLowerCase().includes(q));
  }, [templates, keyword]);

  const openEditModal = (template: TemplateResponse) => {
    setEditName(template.name);
    setEditRole((template.targetRole ?? 'NEW_HIRE') as WorkspaceRole);
    setEditDescription(template.description ?? '');
    setIsEditModalOpen(true);
  };

  const openMembersModal = async (template: TemplateResponse) => {
    setIsMembersModalOpen(true);
    setIsMembersLoading(true);
    try {
      // 이 템플릿이 겨냥한 역할의 실제 구성원을 보여 준다
      const response = await getMembers(0, 50, template.targetRole ?? undefined);
      setMembers(response.items ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '구성원을 불러오지 못했습니다.', 'error');
      setMembers([]);
    } finally {
      setIsMembersLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      showToast('템플릿 이름을 입력해 주세요.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const created = await createTemplate({
        name: newName.trim(),
        targetRole: newRole,
        description: newDescription.trim() || undefined,
      });
      showToast('템플릿을 생성했습니다.', 'success');
      setIsCreationModalOpen(false);
      setNewName('');
      setNewDescription('');
      await load();
      setSelectedTemplateId(created.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '템플릿 생성에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;
    if (!editName.trim()) {
      showToast('템플릿 이름을 입력해 주세요.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await updateTemplate(selectedTemplate.id, {
        name: editName.trim(),
        targetRole: editRole,
        description: editDescription.trim() || undefined,
      });
      showToast('변경 내용을 저장했습니다.', 'success');
      setIsEditModalOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '템플릿 수정에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    try {
      await deleteTemplate(selectedTemplate.id);
      showToast('템플릿을 삭제했습니다.', 'success');
      setIsDeleteModalOpen(false);
      setSelectedTemplateId(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '템플릿 삭제에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCategories = categoriesOf(selectedTemplate?.items ?? null);

  return (
    <div className={styles.container}>
      <CommonSidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div><h1>온보딩 템플릿</h1><p>역할별 30일 인수인계 구성을 템플릿으로 관리하세요.</p></div>
          <button className={styles.createBtn} onClick={() => setIsCreationModalOpen(true)}><Plus size={16} /> 템플릿 생성</button>
        </header>

        <div className={styles.content}>
          <div className={styles.statsWrapper}>
            <div className={styles.statCard}><LayoutTemplate size={22} /><div><span>전체 템플릿</span><strong>{stats.total}<small>개</small></strong><p>등록된 템플릿 수</p></div></div>
            <div className={styles.statCard}><UsersRound size={22} /><div><span>역할</span><strong>{stats.roleCount}<small>개</small></strong><p>대상 역할 종류</p></div></div>
            <div className={styles.statCard}><FileText size={22} /><div><span>총 항목</span><strong>{stats.itemCount}<small>개</small></strong><p>모든 템플릿 항목 수</p></div></div>
            <div className={styles.statCard}><CircleCheck size={22} /><div><span>기본</span><strong>{stats.defaultCount}<small>개</small></strong><p>기본으로 지정된 템플릿</p></div></div>
          </div>

          <div className={styles.mainLayout}>
            <div className={styles.listCard}>
              <h2>템플릿 목록</h2>
              <div className={styles.templates}>
                {isLoading ? (
                  <div className={styles.meta}>불러오는 중...</div>
                ) : error ? (
                  <div className={styles.meta}>
                    {error}{' '}
                    <button className={styles.preview} onClick={() => void load()}>다시 시도</button>
                  </div>
                ) : templates.length === 0 ? (
                  <div className={styles.meta}>아직 템플릿이 없습니다. 템플릿을 만들어 주세요.</div>
                ) : (
                  templates.map(t => (
                    <div
                      key={t.id}
                      className={`${styles.template} ${selectedTemplateId === t.id ? styles.selectedTemplate : ''}`}
                      onClick={() => setSelectedTemplateId(t.id)}
                    >
                      <div className={`${styles.templateIcon} ${t.targetRole === 'MANAGER' ? styles.managerIcon : ''}`}>
                        {t.targetRole === 'MANAGER' ? <Crown size={20} /> : <UsersRound size={20} />}
                      </div>
                      <div className={styles.info}>
                        <div className={styles.name}>
                          {t.name}{' '}
                          <span className={styles.role}>{t.targetRole ? getDisplayLabel(t.targetRole) : '역할 미지정'}</span>{' '}
                          <span className={t.isDefault ? styles.status : styles.draftStatus}>
                            {t.isDefault ? '기본' : '일반'}
                          </span>
                        </div>
                        <div className={styles.meta}>{t.items?.length ?? 0}개 항목</div>
                        <div className={styles.date}>{formatUpdatedAt(t.updatedAt)}</div>
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
              <div className={styles.detailsHeader}>
                <h2>템플릿 상세</h2>
                <button className={styles.preview} onClick={() => setIsDetailsModalOpen(true)} disabled={!selectedTemplate}>
                  미리보기
                </button>
              </div>
              {selectedTemplate ? (
                <>
                  <h3>
                    {selectedTemplate.name}
                    <button
                      className={styles.editBtn}
                      onClick={() => openEditModal(selectedTemplate)}
                      aria-label="템플릿 이름 편집"
                      title="템플릿 편집"
                    >
                      <Edit2 size={14} />
                    </button>
                  </h3>
                  <div className={styles.badge}>
                    {selectedTemplate.targetRole ? getDisplayLabel(selectedTemplate.targetRole) : '역할 미지정'}
                  </div>
                  <div className={selectedTemplate.isDefault ? styles.green : styles.draftText}>
                    {selectedTemplate.isDefault ? '기본 템플릿' : '일반 템플릿'}
                  </div>
                  <p className={styles.desc}>
                    {selectedTemplate.description || '설명이 없습니다.'}
                    <br />
                    {formatUpdatedAt(selectedTemplate.updatedAt)}
                  </p>
                  <div className={styles.stats2}>
                    <div><div>{selectedTemplate.items?.length ?? 0}</div><div>총 항목</div></div>
                    <div><div>{selectedCategories.length}</div><div>카테고리</div></div>
                    <div><div>{durationOf(selectedTemplate.items)}일</div><div>권장 기간</div></div>
                    <div><div>{selectedTemplate.isDefault ? '기본' : '일반'}</div><div>지정 상태</div></div>
                  </div>
                  <h4>카테고리 미리보기</h4>
                  <div className={styles.categories}>
                    {selectedCategories.length === 0 ? (
                      <div>아직 항목이 없습니다.</div>
                    ) : (
                      selectedCategories.map((category, index) => (
                        <div key={category.name}>
                          <span>{index + 1}</span> {category.name}{' '}
                          <span className={styles.count}>{category.itemCount}개 항목</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className={styles.actions}>
                    <button onClick={() => openEditModal(selectedTemplate)}><Edit2 size={16} /> 편집</button>
                    <button className={styles.delete} onClick={() => setIsDeleteModalOpen(true)}><Trash2 size={16} /> 삭제</button>
                  </div>
                </>
              ) : (
                <p className={styles.desc}>왼쪽에서 템플릿을 선택하면 상세 내용이 보입니다.</p>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. 템플릿 생성 */}
      {isCreationModalOpen && (
        <Modal
          open
          onClose={() => setIsCreationModalOpen(false)}
          title="템플릿 생성"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsCreationModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton loading={isSaving} onClick={() => void handleCreate()}>생성</ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>템플릿명</label>
            <input
              type="text"
              placeholder="새로운 템플릿 이름"
              className={styles.input}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>대상 역할</label>
            <select
              className={styles.select}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as WorkspaceRole)}
            >
              {ROLE_OPTIONS.map(role => (
                <option key={role} value={role}>{getDisplayLabel(role)}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>설명</label>
            <textarea
              placeholder="템플릿 설명"
              className={styles.textarea}
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
        </Modal>
      )}

      {/* 2. 템플릿 목록 (검색) */}
      {isListModalOpen && (
        <Modal open onClose={() => setIsListModalOpen(false)} title="템플릿 목록">
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="템플릿 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          {visibleTemplates.length === 0 ? (
            <div className={styles.templateItem}>검색 결과가 없습니다.</div>
          ) : (
            visibleTemplates.map(t => (
              <div
                key={t.id}
                className={styles.templateItem}
                onClick={() => { setSelectedTemplateId(t.id); setIsListModalOpen(false); }}
              >
                <div>{t.name} - {t.targetRole ? getDisplayLabel(t.targetRole) : '역할 미지정'}</div>
                <span>{t.isDefault ? '기본' : '일반'}</span>
              </div>
            ))
          )}
        </Modal>
      )}

      {/* 3. 템플릿 상세 (항목 미리보기) */}
      {isDetailsModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsDetailsModalOpen(false)}
          title={selectedTemplate.name}
          size="lg"
          footer={<ModalSecondaryButton onClick={() => setIsDetailsModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.detail}><strong>역할:</strong> {selectedTemplate.targetRole ? getDisplayLabel(selectedTemplate.targetRole) : '역할 미지정'}</div>
          <div className={styles.detail}><strong>지정 상태:</strong> {selectedTemplate.isDefault ? '기본 템플릿' : '일반 템플릿'}</div>
          <div className={styles.detail}><strong>항목 수:</strong> {selectedTemplate.items?.length ?? 0}</div>
          <div className={styles.detail}><strong>권장 기간:</strong> {durationOf(selectedTemplate.items)}일</div>
          <div className={styles.detail}><strong>설명:</strong> {selectedTemplate.description || '설명이 없습니다.'}</div>
          {(selectedTemplate.items ?? [])
            .slice()
            .sort((a, b) => a.dayIndex - b.dayIndex || a.sortOrder - b.sortOrder)
            .map(item => (
              <div key={item.id} className={styles.templateItem}>
                <div>{item.dayIndex}일차 · {item.title}</div>
                <span>{getDisplayLabel(item.type)}</span>
              </div>
            ))}
        </Modal>
      )}

      {/* 4. 템플릿 편집 */}
      {isEditModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsEditModalOpen(false)}
          title="템플릿 편집"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsEditModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton loading={isSaving} onClick={() => void handleUpdate()}>저장</ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>템플릿명</label>
            <input
              type="text"
              className={styles.input}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>대상 역할</label>
            <select
              className={styles.select}
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as WorkspaceRole)}
            >
              {ROLE_OPTIONS.map(role => (
                <option key={role} value={role}>{getDisplayLabel(role)}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>설명</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>
          <h4>포함된 항목</h4>
          {(selectedTemplate.items ?? []).length === 0 ? (
            <div className={styles.categoryItem}><span>등록된 항목이 없습니다.</span></div>
          ) : (
            (selectedTemplate.items ?? [])
              .slice()
              .sort((a, b) => a.dayIndex - b.dayIndex || a.sortOrder - b.sortOrder)
              .map((item, index) => (
                <div key={item.id} className={styles.categoryItem}>
                  <span>{index + 1}. {item.dayIndex}일차 · {item.title}</span>
                  <span className={styles.count}>{getDisplayLabel(item.type)}</span>
                </div>
              ))
          )}
        </Modal>
      )}

      {/* 5. 대상 역할 구성원 */}
      {isMembersModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsMembersModalOpen(false)}
          title="대상 역할 구성원"
          subtitle={selectedTemplate.targetRole ? getDisplayLabel(selectedTemplate.targetRole) : '역할 미지정'}
          footer={<ModalSecondaryButton onClick={() => setIsMembersModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.memberList}>
            {isMembersLoading ? (
              <div className={styles.member}>불러오는 중...</div>
            ) : members.length === 0 ? (
              <div className={styles.member}>해당 역할의 구성원이 없습니다.</div>
            ) : (
              members.map(member => (
                <div key={member.id} className={styles.member}>
                  {member.name} ({getDisplayLabel(member.role)}) · {member.email}
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* 6. 템플릿 삭제 */}
      {isDeleteModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsDeleteModalOpen(false)}
          title="템플릿 삭제"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDeleteModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalDangerButton loading={isSaving} onClick={() => void handleDelete()}>삭제</ModalDangerButton>
            </>
          }
        >
          <p>‘{selectedTemplate.name}’을(를) 삭제하시겠습니까?</p>
        </Modal>
      )}

      {/* 7. 항목 메뉴 */}
      {isActionsMenuOpen && selectedTemplate && (
        <div className={styles.menuOverlay} onClick={() => setIsActionsMenuOpen(false)}>
          <div className={styles.actionMenu} onClick={(e) => e.stopPropagation()}>
            <button className={styles.actionItem} onClick={() => { setIsDetailsModalOpen(true); setIsActionsMenuOpen(false); }}>상세 보기</button>
            <button className={styles.actionItem} onClick={() => { openEditModal(selectedTemplate); setIsActionsMenuOpen(false); }}>템플릿 편집</button>
            <button className={styles.actionItem} onClick={() => { void openMembersModal(selectedTemplate); setIsActionsMenuOpen(false); }}>대상 구성원 보기</button>
            <button className={styles.actionItem} onClick={() => { setIsListModalOpen(true); setIsActionsMenuOpen(false); }}>템플릿 검색</button>
            <button className={styles.actionItem} onClick={() => { setIsDeleteModalOpen(true); setIsActionsMenuOpen(false); }}>삭제</button>
          </div>
        </div>
      )}
    </div>
  );
}
