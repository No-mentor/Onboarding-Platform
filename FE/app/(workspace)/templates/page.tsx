'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Search, MoreVertical, LayoutTemplate, UsersRound, FileText, CircleCheck, Crown, Sparkles } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  createTemplate,
  deleteTemplate,
  generateTemplate,
  getDocuments,
  getMembers,
  getTemplateDetail,
  getTemplates,
  updateTemplate,
  type DocumentResponse,
  type GeneratedTemplateResponse,
  type MemberResponse,
  type TemplateItemPayload,
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

const ITEM_TYPES = ['DOCUMENT', 'CHECKLIST', 'PERSON', 'PRACTICE'] as const;

/**
 * 템플릿 항목 편집기.
 * 항목 없이 저장된 템플릿은 계획에 아무 영향을 주지 않으므로,
 * 생성·편집·AI 초안 세 곳에서 같은 편집기를 쓴다.
 */
function TemplateItemsEditor({
  items,
  maxDay,
  disabled,
  onChange,
}: {
  items: TemplateItemPayload[];
  maxDay: number;
  disabled: boolean;
  onChange: (next: TemplateItemPayload[]) => void;
}) {
  const patch = (index: number, part: Partial<TemplateItemPayload>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...part } : item)));

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const add = () =>
    onChange([
      ...items,
      {
        dayIndex: items.length === 0 ? 1 : Math.min(maxDay, items[items.length - 1].dayIndex + 1),
        type: 'CHECKLIST',
        title: '',
        description: '',
      },
    ]);

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '13px', color: '#475569', marginBottom: '8px',
      }}>
        <span>계획 항목 {items.length > 0 && `(${items.length}개)`}</span>
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          style={{
            border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '6px',
            padding: '5px 10px', fontSize: '12.5px', cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <Plus size={13} /> 항목 추가
        </button>
      </div>

      <div style={{
        maxHeight: '300px', overflowY: 'auto',
        border: '1px solid #e2e8f0', borderRadius: '10px',
      }}>
        {items.length === 0 ? (
          <div style={{ padding: '16px', fontSize: '13px', color: '#985050', lineHeight: 1.7 }}>
            항목이 없습니다. <strong>항목이 없는 템플릿은 계획에 반영되지 않습니다.</strong><br />
            직접 추가하거나, 문서로 AI 생성을 이용해 주세요.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px',
                borderTop: index === 0 ? 'none' : '1px solid #f1f5f9',
              }}
            >
              <input
                type="number"
                min={1}
                max={maxDay}
                value={item.dayIndex}
                onChange={(e) => patch(index, {
                  dayIndex: Math.max(1, Math.min(maxDay, Number(e.target.value) || 1)),
                })}
                disabled={disabled}
                title="일차"
                style={{ width: '58px', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <select
                value={item.type}
                onChange={(e) => patch(index, { type: e.target.value as TemplateItemPayload['type'] })}
                disabled={disabled}
                title="종류"
                style={{ width: '112px', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                {ITEM_TYPES.map(t => (
                  <option key={t} value={t}>{getDisplayLabel(t)}</option>
                ))}
              </select>
              <input
                value={item.title}
                onChange={(e) => patch(index, { title: e.target.value })}
                disabled={disabled}
                placeholder="무엇을 하는지 (필수)"
                title="제목"
                style={{ flex: 1, padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={disabled}
                title="이 항목 제거"
                style={{
                  border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '6px',
                  padding: '7px 8px', cursor: disabled ? 'not-allowed' : 'pointer', color: '#985050',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
  // 항목 없이 저장하면 계획에 반영되지 않으므로 생성 폼에서도 항목을 받는다
  const [newItems, setNewItems] = useState<TemplateItemPayload[]>([]);
  const [newIsDefault, setNewIsDefault] = useState(true);

  // 편집 폼
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<WorkspaceRole>('NEW_HIRE');
  const [editDescription, setEditDescription] = useState('');
  const [editItems, setEditItems] = useState<TemplateItemPayload[]>([]);
  const [editIsDefault, setEditIsDefault] = useState(false);

  // 템플릿 대상 역할의 멤버
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  const [keyword, setKeyword] = useState('');

  // === AI 템플릿 생성 ===
  // 생성은 저장하지 않고 초안만 받는다. 검토·수정 후 저장 버튼을 눌러야 실제로 만들어진다.
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genRole, setGenRole] = useState<WorkspaceRole>('NEW_HIRE');
  const [genDepartment, setGenDepartment] = useState('');
  const [genPlanDays, setGenPlanDays] = useState(30);
  const [genDocuments, setGenDocuments] = useState<DocumentResponse[]>([]);
  const [genSelectedDocIds, setGenSelectedDocIds] = useState<string[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  /** 생성된 초안. null 이면 아직 조건 입력 단계 */
  const [draft, setDraft] = useState<GeneratedTemplateResponse | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftItems, setDraftItems] = useState<TemplateItemPayload[]>([]);
  const [draftIsDefault, setDraftIsDefault] = useState(true);

  const openGenerateModal = async () => {
    setDraft(null);
    setDraftItems([]);
    setGenSelectedDocIds([]);
    setIsGenerateModalOpen(true);

    setIsDocsLoading(true);
    try {
      // READY 문서만 근거로 쓸 수 있다 (텍스트 추출이 끝난 것)
      const response = await getDocuments({ page: 0, size: 100 });
      setGenDocuments((response.items ?? []).filter(d => d.status === 'READY'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : '문서 목록을 불러오지 못했습니다.', 'error');
      setGenDocuments([]);
    } finally {
      setIsDocsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTemplate({
        targetRole: genRole,
        department: genDepartment.trim() || undefined,
        documentIds: genSelectedDocIds.length > 0 ? genSelectedDocIds : undefined,
        planDays: genPlanDays,
      });
      setDraft(result);
      setDraftName(result.name);
      setDraftItems(result.items);
      if (!result.aiGenerated) {
        showToast(result.fallbackReason ?? 'AI를 사용할 수 없어 기본 골격을 만들었습니다.', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'AI 템플릿 생성에 실패했습니다.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftName.trim()) {
      showToast('템플릿 이름을 입력해 주세요.', 'error');
      return;
    }
    if (draftItems.length === 0) {
      showToast('항목이 하나도 없습니다.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const created = await createTemplate({
        name: draftName.trim(),
        targetRole: draft?.targetRole ?? genRole,
        description: draft?.description ?? undefined,
        // 기본으로 지정하지 않으면, 같은 역할에 이미 기본 템플릿이 있을 때
        // 서버가 그쪽을 먼저 골라서 방금 만든 템플릿이 계획에 반영되지 않는다
        isDefault: draftIsDefault,
        items: draftItems.map((item, index) => ({ ...item, sortOrder: index })),
      });
      showToast(`${created.name} 템플릿을 저장했습니다.`, 'success');
      setIsGenerateModalOpen(false);
      setDraft(null);
      await load();
      setSelectedTemplateId(created.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '템플릿 저장에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraftItem = (index: number, patch: Partial<TemplateItemPayload>) => {
    setDraftItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeDraftItem = (index: number) => {
    setDraftItems(prev => prev.filter((_, i) => i !== index));
  };

  const toggleGenDoc = (documentId: string) => {
    setGenSelectedDocIds(prev =>
      prev.includes(documentId) ? prev.filter(id => id !== documentId) : [...prev, documentId]
    );
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTemplates();
      const list = response.items ?? [];

      // 목록 API 는 items 를 비워서 준다(GET /templates). 항목 수·기간·카테고리·통계가
      // 전부 0으로 보이던 원인이라, 상세를 함께 받아 채운다.
      const detailed = await Promise.all(
        list.map(async (t) => {
          try {
            return await getTemplateDetail(t.id);
          } catch {
            // 한 건이 실패해도 목록 전체를 잃지 않는다 (항목만 비어 보인다)
            return t;
          }
        })
      );

      setTemplates(detailed);
      // 목록이 바뀌어도 고른 템플릿이 남아 있으면 유지한다
      setSelectedTemplateId(prev =>
        prev && detailed.some(t => t.id === prev) ? prev : (detailed[0]?.id ?? null)
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
    setEditIsDefault(template.isDefault);
    // 목록에서 온 객체는 items 가 비어 있을 수 있으므로 상세에서 채운 값을 쓴다
    setEditItems(
      (template.items ?? []).map(i => ({
        dayIndex: i.dayIndex,
        type: i.type,
        title: i.title,
        description: i.description ?? undefined,
        sortOrder: i.sortOrder,
      }))
    );
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
    const usable = newItems.filter(i => i.title.trim());
    setIsSaving(true);
    try {
      const created = await createTemplate({
        name: newName.trim(),
        targetRole: newRole,
        description: newDescription.trim() || undefined,
        isDefault: newIsDefault,
        items: usable.map((item, index) => ({ ...item, title: item.title.trim(), sortOrder: index })),
      });
      showToast(
        usable.length === 0
          ? '템플릿을 생성했습니다. 항목이 없어 계획에는 반영되지 않습니다.'
          : `템플릿을 생성했습니다. (항목 ${usable.length}개)`,
        usable.length === 0 ? 'error' : 'success'
      );
      setIsCreationModalOpen(false);
      setNewName('');
      setNewDescription('');
      setNewItems([]);
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
      const usable = editItems.filter(i => i.title.trim());
      await updateTemplate(selectedTemplate.id, {
        name: editName.trim(),
        targetRole: editRole,
        description: editDescription.trim() || undefined,
        isDefault: editIsDefault,
        // 서버는 items 가 있으면 기존 항목을 지우고 새로 저장한다.
        // 편집기에서 불러온 값을 그대로 되돌려 보내야 기존 항목이 사라지지 않는다.
        items: usable.map((item, index) => ({ ...item, title: item.title.trim(), sortOrder: index })),
      });
      showToast('변경 내용을 저장했습니다. 기존 계획은 재생성해야 반영됩니다.', 'success');
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={styles.createBtn} onClick={() => void openGenerateModal()}>
              <Sparkles size={16} /> 문서로 AI 생성
            </button>
            <button className={styles.createBtn} onClick={() => setIsCreationModalOpen(true)}><Plus size={16} /> 템플릿 생성</button>
          </div>
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
          <div className={styles.formGroup}>
            <TemplateItemsEditor
              items={newItems}
              maxDay={30}
              disabled={isSaving}
              onChange={setNewItems}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
            <input
              type="checkbox"
              checked={newIsDefault}
              onChange={(e) => setNewIsDefault(e.target.checked)}
              disabled={isSaving}
            />
            이 역할의 기본 템플릿으로 지정 (같은 역할에 기본 템플릿이 이미 있으면 그쪽이 먼저 적용됩니다)
          </label>
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
          <div className={styles.formGroup}>
            <TemplateItemsEditor
              items={editItems}
              maxDay={30}
              disabled={isSaving}
              onChange={setEditItems}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
            <input
              type="checkbox"
              checked={editIsDefault}
              onChange={(e) => setEditIsDefault(e.target.checked)}
              disabled={isSaving}
            />
            이 역할의 기본 템플릿으로 지정
          </label>
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

      {/* 8. 문서로 AI 템플릿 생성 — 초안을 검토·수정한 뒤 저장한다 */}
      {isGenerateModalOpen && (
        <Modal
          open
          onClose={() => setIsGenerateModalOpen(false)}
          title="문서로 AI 템플릿 생성"
          subtitle={draft ? '내용을 확인하고 수정한 뒤 저장하세요.' : '업로드된 문서를 근거로 온보딩 항목을 만듭니다.'}
          size="lg"
          closeOnBackdrop={!isGenerating && !isSaving}
          footer={
            draft ? (
              <>
                <ModalSecondaryButton onClick={() => setDraft(null)} disabled={isSaving}>
                  조건 다시 설정
                </ModalSecondaryButton>
                <ModalPrimaryButton loading={isSaving} onClick={() => void handleSaveDraft()}>
                  템플릿으로 저장 ({draftItems.length}개 항목)
                </ModalPrimaryButton>
              </>
            ) : (
              <>
                <ModalSecondaryButton onClick={() => setIsGenerateModalOpen(false)} disabled={isGenerating}>
                  취소
                </ModalSecondaryButton>
                <ModalPrimaryButton loading={isGenerating} onClick={() => void handleGenerate()}>
                  생성하기
                </ModalPrimaryButton>
              </>
            )
          }
        >
          {!draft ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ flex: '1 1 160px', fontSize: '13px', color: '#475569' }}>
                  대상 역할
                  <select
                    value={genRole}
                    onChange={(e) => setGenRole(e.target.value as WorkspaceRole)}
                    disabled={isGenerating}
                    style={{ width: '100%', marginTop: '6px', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    {ROLE_OPTIONS.map(role => (
                      <option key={role} value={role}>{getDisplayLabel(role)}</option>
                    ))}
                  </select>
                </label>
                <label style={{ flex: '1 1 160px', fontSize: '13px', color: '#475569' }}>
                  부서 (선택)
                  <input
                    value={genDepartment}
                    onChange={(e) => setGenDepartment(e.target.value)}
                    placeholder="예: 마케팅팀"
                    disabled={isGenerating}
                    style={{ width: '100%', marginTop: '6px', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </label>
                <label style={{ flex: '0 0 110px', fontSize: '13px', color: '#475569' }}>
                  기간(일)
                  <input
                    type="number"
                    min={7}
                    max={30}
                    value={genPlanDays}
                    onChange={(e) => setGenPlanDays(Math.max(7, Math.min(30, Number(e.target.value) || 30)))}
                    disabled={isGenerating}
                    style={{ width: '100%', marginTop: '6px', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </label>
              </div>

              <div>
                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                  근거 문서 {genSelectedDocIds.length > 0 ? `(${genSelectedDocIds.length}건 선택)` : '(선택 안 하면 전체 사용)'}
                </div>
                <div style={{ maxHeight: '190px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  {isDocsLoading ? (
                    <div style={{ padding: '14px', fontSize: '13px', color: '#64748b' }}>문서를 불러오는 중...</div>
                  ) : genDocuments.length === 0 ? (
                    <div style={{ padding: '14px', fontSize: '13px', color: '#64748b' }}>
                      처리 완료된 문서가 없습니다. 문서를 업로드하면 그 내용을 근거로 계획을 만듭니다.
                    </div>
                  ) : (
                    genDocuments.map((doc, index) => (
                      <label
                        key={doc.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                          borderTop: index === 0 ? 'none' : '1px solid #f1f5f9', fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={genSelectedDocIds.includes(doc.id)}
                          onChange={() => toggleGenDoc(doc.id)}
                          disabled={isGenerating}
                        />
                        <span style={{ color: '#0f172a', wordBreak: 'break-all' }}>{doc.title}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
                생성에 10초 이상 걸릴 수 있습니다. 결과는 바로 저장되지 않으니, 확인하고 고친 뒤 저장하세요.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '12px 14px', borderRadius: '10px', fontSize: '12.5px', lineHeight: 1.7,
                backgroundColor: draft.aiGenerated ? '#eff6ff' : '#fffbeb',
                border: `1px solid ${draft.aiGenerated ? '#dbeafe' : '#fde68a'}`,
                color: draft.aiGenerated ? '#1e40af' : '#92400e',
              }}>
                {draft.aiGenerated
                  ? <>문서 {draft.sourceDocuments.length}건을 근거로 {draft.model} 이(가) 만든 초안입니다. 사실과 다른 항목이 있을 수 있으니 확인해 주세요.</>
                  : <>{draft.fallbackReason} 항목을 직접 수정해 사용하세요.</>}
              </div>

              <label style={{ fontSize: '13px', color: '#475569' }}>
                템플릿 이름
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  disabled={isSaving}
                  style={{ width: '100%', marginTop: '6px', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </label>

              <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                {draftItems.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px',
                      borderTop: index === 0 ? 'none' : '1px solid #f1f5f9',
                    }}
                  >
                    <input
                      type="number"
                      min={1}
                      max={genPlanDays}
                      value={item.dayIndex}
                      onChange={(e) => updateDraftItem(index, {
                        dayIndex: Math.max(1, Math.min(genPlanDays, Number(e.target.value) || 1)),
                      })}
                      disabled={isSaving}
                      title="일차"
                      style={{ width: '58px', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    <select
                      value={item.type}
                      onChange={(e) => updateDraftItem(index, { type: e.target.value as TemplateItemPayload['type'] })}
                      disabled={isSaving}
                      title="종류"
                      style={{ width: '112px', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      {(['DOCUMENT', 'CHECKLIST', 'PERSON', 'PRACTICE'] as const).map(t => (
                        <option key={t} value={t}>{getDisplayLabel(t)}</option>
                      ))}
                    </select>
                    <input
                      value={item.title}
                      onChange={(e) => updateDraftItem(index, { title: e.target.value })}
                      disabled={isSaving}
                      title="제목"
                      style={{ flex: 1, padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    <button
                      onClick={() => removeDraftItem(index)}
                      disabled={isSaving}
                      title="이 항목 제거"
                      style={{
                        border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '6px',
                        padding: '7px 8px', cursor: 'pointer', color: '#985050',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                <input
                  type="checkbox"
                  checked={draftIsDefault}
                  onChange={(e) => setDraftIsDefault(e.target.checked)}
                  disabled={isSaving}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  이 역할의 기본 템플릿으로 지정<br />
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    끄면, 같은 역할에 이미 기본 템플릿이 있을 경우 그쪽이 먼저 적용되어
                    방금 만든 템플릿이 계획에 반영되지 않습니다.
                  </span>
                </span>
              </label>

              {draft.sourceDocuments.length > 0 && (
                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
                  근거 문서: {draft.sourceDocuments.join(', ')}
                </p>
              )}
            </div>
          )}
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
