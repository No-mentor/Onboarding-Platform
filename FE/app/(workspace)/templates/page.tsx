'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Search, LayoutTemplate, UsersRound, FileText, CircleCheck, Crown, Sparkles, ChevronUp, ChevronDown, Clock, RefreshCw } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  createTemplate,
  deleteTemplate,
  generateTemplate,
  getDocuments,
  getTemplateDetail,
  getTemplates,
  getTemplateAffectedUsers,
  applyTemplateToPlans,
  updateTemplate,
  type AffectedUserSummary,
  type DocumentResponse,
  type GeneratedTemplateResponse,
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
 * 유형별 개수. 서버가 목록·상세 응답에 집계를 담아 주므로 그 값을 그대로 쓴다.
 * (화면에서 다시 세면 서버 값과 어긋날 수 있다)
 */
function typeCountsOf(t: TemplateResponse): Array<{ name: string; itemCount: number }> {
  return [
    { name: getDisplayLabel('DOCUMENT'), itemCount: t.documentCount },
    { name: getDisplayLabel('CHECKLIST'), itemCount: t.checklistCount },
    { name: getDisplayLabel('PERSON'), itemCount: t.personCount },
    { name: getDisplayLabel('PRACTICE'), itemCount: t.practiceCount },
  ].filter(c => c.itemCount > 0);
}

/** 항목의 가장 큰 dayIndex. "권장 기간"이 아니라 마지막 항목이 며칠차인지다 */
function durationOf(items: TemplateItemResponse[] | null): number {
  return (items ?? []).reduce((max, item) => Math.max(max, item.dayIndex), 0);
}

/** 분 단위를 "3시간 20분" 처럼 읽기 쉽게 */
function formatMinutes(total: number): string {
  if (!total) return '0분';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

/**
 * 편집기 안에서만 쓰는, 항목 하나를 가리키는 안정적인 key.
 * index 를 key 로 쓰면 삭제·이동 중에 React 가 엉뚱한 행에 같은 DOM 을 재사용해
 * 입력 포커스가 다른 행으로 튀는 것처럼 보인다. 저장 payload 에는 포함하지 않는다.
 */
interface EditableTemplateItem extends TemplateItemPayload {
  _key: string;
}

function newClientKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tmp-${Math.random()}`;
}

/** 상세 응답의 items 를 편집기가 쓰는 payload 로 옮긴다. 서버 item id 를 그대로 안정 key 로 쓴다 */
function toPayloads(items: TemplateItemResponse[] | null): EditableTemplateItem[] {
  return (items ?? [])
    .slice()
    .sort((a, b) => a.dayIndex - b.dayIndex || a.sortOrder - b.sortOrder)
    .map(i => ({
      _key: i.id,
      dayIndex: i.dayIndex,
      type: i.type,
      title: i.title,
      description: i.description ?? undefined,
      sortOrder: i.sortOrder,
      documentId: i.type === 'DOCUMENT' ? (i.documentId ?? undefined) : undefined,
      estimatedMinutes: i.estimatedMinutes ?? undefined,
    }));
}

/** AI 초안(TemplateItemPayload[])에 편집기용 안정 key 를 붙인다 */
function toEditable(items: TemplateItemPayload[]): EditableTemplateItem[] {
  return items.map(i => ({ ...i, _key: newClientKey() }));
}

/**
 * 저장 직전 정리.
 * - 제목이 빈 항목은 버린다
 * - sortOrder 를 화면 순서대로 다시 매긴다
 * - documentId 는 DOCUMENT 항목에만 남긴다 (서버가 비-DOCUMENT 의 documentId 를 거부한다)
 * - _key 는 화면 전용이라 payload 에 넣지 않는다
 */
function toSavePayload(items: EditableTemplateItem[]): TemplateItemPayload[] {
  return items
    .filter(i => i.title.trim())
    .map((item, index) => {
      const payload: TemplateItemPayload = {
        dayIndex: item.dayIndex,
        type: item.type,
        title: item.title.trim(),
        sortOrder: index,
      };
      if (item.description?.trim()) payload.description = item.description.trim();
      if (item.type === 'DOCUMENT' && item.documentId) payload.documentId = item.documentId;
      if (typeof item.estimatedMinutes === 'number') payload.estimatedMinutes = item.estimatedMinutes;
      return payload;
    });
}

/** DOCUMENT 항목인데 문서가 연결되지 않은 첫 항목. 있으면 저장을 막아야 한다 */
function findUnlinkedDocumentItem(items: EditableTemplateItem[]): EditableTemplateItem | undefined {
  return items.find(i => i.type === 'DOCUMENT' && !i.documentId && i.title.trim());
}

/** 서버는 documentId 만 주므로, 화면에 이름을 보여 주려면 문서 목록에서 찾아야 한다 */
function documentTitleOf(documentId: string, documents: DocumentResponse[]): string {
  return documents.find(d => d.id === documentId)?.title ?? '연결됨';
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
  documents,
  onChange,
}: {
  items: EditableTemplateItem[];
  maxDay: number;
  disabled: boolean;
  /** DOCUMENT 항목에서 고를 수 있는 READY 문서 */
  documents: DocumentResponse[];
  onChange: (next: EditableTemplateItem[]) => void;
}) {
  /**
   * 유형이 바뀌면 documentId 를 정리한다.
   * 서버는 비-DOCUMENT 항목의 documentId 를 받지 않으므로 남겨 두면 검증에 걸린다.
   */
  const patch = (index: number, part: Partial<EditableTemplateItem>) =>
    onChange(items.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, ...part };
      if (next.type !== 'DOCUMENT') delete next.documentId;
      return next;
    }));

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  /** 위/아래로 옮긴다. sortOrder 는 저장 직전에 배열 순서대로 다시 매긴다 */
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = () =>
    onChange([
      ...items,
      {
        _key: newClientKey(),
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
              key={item._key}
              style={{
                display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px',
                borderTop: index === 0 ? 'none' : '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                  style={{ width: '56px', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <select
                  value={item.type}
                  onChange={(e) => patch(index, { type: e.target.value as TemplateItemPayload['type'] })}
                  disabled={disabled}
                  title="종류"
                  style={{ width: '108px', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  {ITEM_TYPES.map(t => (
                    <option key={t} value={t} disabled={t === 'DOCUMENT' && documents.length === 0}>
                      {getDisplayLabel(t)}
                    </option>
                  ))}
                </select>
                <input
                  value={item.title}
                  onChange={(e) => patch(index, { title: e.target.value })}
                  disabled={disabled}
                  placeholder="무엇을 하는지 (필수)"
                  title="제목"
                  style={{ flex: 1, minWidth: '120px', padding: '7px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <input
                  type="number"
                  min={0}
                  value={item.estimatedMinutes ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    patch(index, {
                      estimatedMinutes: raw === '' ? undefined : Math.max(0, Number(raw) || 0),
                    });
                  }}
                  disabled={disabled}
                  placeholder="분"
                  title="예상 소요 시간(분)"
                  style={{ width: '64px', padding: '7px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <button
                  type="button" onClick={() => move(index, -1)} disabled={disabled || index === 0}
                  title="위로" aria-label="위로"
                  style={{
                    border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '6px',
                    padding: '6px', cursor: disabled || index === 0 ? 'not-allowed' : 'pointer',
                    opacity: index === 0 ? 0.4 : 1,
                  }}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button" onClick={() => move(index, 1)} disabled={disabled || index === items.length - 1}
                  title="아래로" aria-label="아래로"
                  style={{
                    border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '6px',
                    padding: '6px', cursor: disabled || index === items.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: index === items.length - 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  title="이 항목 제거"
                  style={{
                    border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '6px',
                    padding: '6px', cursor: disabled ? 'not-allowed' : 'pointer', color: '#985050',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/*
                DOCUMENT 항목은 문서 연결이 필수다. 서버가 documentId 없는 DOCUMENT 항목을 400 으로
                거부하므로 ("연결 안 함" 을 허용하면 저장 시점에야 실패한다), 여기서 항상 실제
                문서를 고르게 하고 문서가 없으면 저장 자체를 findUnlinkedDocumentItem 으로 막는다.
              */}
              {item.type === 'DOCUMENT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '2px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>연결 문서</span>
                    <select
                      value={item.documentId ?? ''}
                      onChange={(e) => patch(index, { documentId: e.target.value || undefined })}
                      disabled={disabled || documents.length === 0}
                      style={{
                        flex: 1, padding: '7px', borderRadius: '6px', fontSize: '12.5px',
                        border: `1px solid ${!item.documentId ? '#dc2626' : '#cbd5e1'}`,
                      }}
                    >
                      <option value="" disabled>
                        {documents.length === 0 ? '연결 가능한 문서 없음' : '문서를 선택하세요'}
                      </option>
                      {documents.map(doc => (
                        <option key={doc.id} value={doc.id}>{doc.title}</option>
                      ))}
                    </select>
                  </div>
                  {documents.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#985050' }}>
                      먼저 처리 완료(READY)된 문서를 업로드해야 이 항목을 저장할 수 있습니다.
                    </span>
                  ) : !item.documentId && (
                    <span style={{ fontSize: '12px', color: '#985050' }}>
                      문서를 선택해야 저장할 수 있습니다.
                    </span>
                  )}
                </div>
              )}
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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 상세 API 로 받은 템플릿. 편집은 항상 이 값을 근거로 한다
  const [detail, setDetail] = useState<TemplateResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  // DOCUMENT 항목에서 고를 READY 문서 (편집기 공용)
  const [readyDocuments, setReadyDocuments] = useState<DocumentResponse[]>([]);

  // 생성 폼
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<WorkspaceRole>('NEW_HIRE');
  const [newDescription, setNewDescription] = useState('');
  // 항목 없이 저장하면 계획에 반영되지 않으므로 생성 폼에서도 항목을 받는다
  const [newItems, setNewItems] = useState<EditableTemplateItem[]>([]);
  const [newIsDefault, setNewIsDefault] = useState(true);

  // 편집 폼
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<WorkspaceRole>('NEW_HIRE');
  const [editDescription, setEditDescription] = useState('');
  const [editItems, setEditItems] = useState<EditableTemplateItem[]>([]);
  const [editIsDefault, setEditIsDefault] = useState(false);


  const [keyword, setKeyword] = useState('');

  // === 템플릿 일괄 적용 ===
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isApplyLoading, setIsApplyLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [affectedUsers, setAffectedUsers] = useState<AffectedUserSummary[]>([]);
  const [applyKeepCompleted, setApplyKeepCompleted] = useState(true);

  const openApplyModal = async (templateId: string) => {
    setIsApplyModalOpen(true);
    setIsApplyLoading(true);
    setAffectedUsers([]);
    setApplyKeepCompleted(true);
    try {
      const result = await getTemplateAffectedUsers(templateId);
      setAffectedUsers(result.users);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '영향 받는 사용자를 불러오지 못했습니다.', 'error');
      setIsApplyModalOpen(false);
    } finally {
      setIsApplyLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedTemplate) return;
    setIsApplying(true);
    try {
      const result = await applyTemplateToPlans(selectedTemplate.id, { keepCompleted: applyKeepCompleted });
      if (result.failCount > 0) {
        showToast(`${result.successCount}명 적용 완료, ${result.failCount}명 실패`, 'error');
      } else {
        showToast(`${result.successCount}명의 계획이 최신 템플릿으로 업데이트되었습니다.`, 'success');
      }
      setIsApplyModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '일괄 적용에 실패했습니다.', 'error');
    } finally {
      setIsApplying(false);
    }
  };

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
  const [draftItems, setDraftItems] = useState<EditableTemplateItem[]>([]);
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
      setDraftItems(toEditable(result.items));
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
    const unlinked = findUnlinkedDocumentItem(draftItems);
    if (unlinked) {
      showToast(`"${unlinked.title || '제목 없음'}" 항목에 연결할 문서를 선택해 주세요.`, 'error');
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
        items: toSavePayload(draftItems),
      });
      showToast(`${created.name} 템플릿을 저장했습니다.`, 'success');
      setIsGenerateModalOpen(false);
      setDraft(null);
      await load();
      await selectTemplate(created.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '템플릿 저장에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
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
      // 목록 응답이 items 와 집계(itemCount·유형별 개수·totalEstimatedMinutes)를 함께 준다.
      // 통계를 화면에서 다시 세지 않고 이 값을 그대로 쓴다.
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

  /** DOCUMENT 항목 연결에 쓸 READY 문서. 편집기 세 곳이 공유한다 */
  const loadReadyDocuments = useCallback(async () => {
    try {
      const response = await getDocuments({ page: 0, size: 100 });
      setReadyDocuments((response.items ?? []).filter(d => d.status === "READY"));
    } catch {
      // 문서를 못 받아도 템플릿 편집 자체는 가능하다 (연결만 못 한다)
      setReadyDocuments([]);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReadyDocuments();
  }, [load, loadReadyDocuments]);

  /**
   * 고른 템플릿은 상세 API 로 받은 것을 우선 쓴다.
   * 목록도 items 를 주지만, 편집은 항상 상세를 근거로 해야 다른 사람이 방금 바꾼 항목까지 반영된다.
   */
  const selectedTemplate = useMemo(
    () => (detail && detail.id === selectedTemplateId
      ? detail
      : templates.find(t => t.id === selectedTemplateId) ?? null),
    [detail, templates, selectedTemplateId]
  );

  /** 템플릿을 고르면 상세를 불러온다 */
  const selectTemplate = useCallback(async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsDetailLoading(true);
    try {
      setDetail(await getTemplateDetail(templateId));
    } catch (err) {
      // 상세를 못 받아도 목록 값으로 계속 보여 준다
      setDetail(null);
      showToast(err instanceof Error ? err.message : '템플릿 상세를 불러오지 못했습니다.', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  }, [showToast]);

  // 서버가 주는 itemCount / totalEstimatedMinutes 를 합산한다 (items 를 다시 세지 않는다)
  const stats = useMemo(() => ({
    total: templates.length,
    itemCount: templates.reduce((sum, t) => sum + t.itemCount, 0),
    totalMinutes: templates.reduce((sum, t) => sum + t.totalEstimatedMinutes, 0),
    defaultCount: templates.filter(t => t.isDefault).length,
  }), [templates]);

  const visibleTemplates = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(t => t.name.toLowerCase().includes(q));
  }, [templates, keyword]);

  /**
   * "템플릿 생성" 모달은 항상 빈 상태로 시작해야 한다.
   * 취소(또는 배경 클릭/ESC)로 닫았을 때는 폼을 비우지 않으므로, 다시 열 때 여기서
   * 명확하게 초기화한다 — 그러지 않으면 이전에 입력하다 만 값이나 반쯤 만든 항목이
   * 새로 만드는 템플릿에 섞여 들어갈 수 있다.
   */
  const openCreationModal = () => {
    setNewName('');
    setNewRole('NEW_HIRE');
    setNewDescription('');
    setNewItems([]);
    setNewIsDefault(true);
    setIsCreationModalOpen(true);
  };

  /** 목록 응답으로 편집 화면을 구성하지 않는다. 항상 상세 API 를 다시 받아 그 items 로 채운다 */
  const openEditModal = async (template: TemplateResponse) => {
    setIsEditModalOpen(true);
    setEditName(template.name);
    setEditRole((template.targetRole ?? 'NEW_HIRE') as WorkspaceRole);
    setEditDescription(template.description ?? '');
    setEditIsDefault(template.isDefault);
    setEditItems([]);

    setIsDetailLoading(true);
    try {
      const fresh = await getTemplateDetail(template.id);
      setDetail(fresh);
      setEditName(fresh.name);
      setEditRole((fresh.targetRole ?? 'NEW_HIRE') as WorkspaceRole);
      setEditDescription(fresh.description ?? '');
      setEditIsDefault(fresh.isDefault);
      setEditItems(toPayloads(fresh.items));
    } catch (err) {
      showToast(err instanceof Error ? err.message : '템플릿 상세를 불러오지 못했습니다.', 'error');
      setIsEditModalOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      showToast('템플릿 이름을 입력해 주세요.', 'error');
      return;
    }
    const payload = toSavePayload(newItems);
    // 서버가 빈 items 를 거부한다(@NotEmpty). 400 을 받기 전에 화면에서 막는다
    if (payload.length === 0) {
      showToast('항목을 1개 이상 추가해 주세요. 항목이 없는 템플릿은 저장할 수 없습니다.', 'error');
      return;
    }
    const unlinked = findUnlinkedDocumentItem(newItems);
    if (unlinked) {
      showToast(`"${unlinked.title || '제목 없음'}" 항목에 연결할 문서를 선택해 주세요.`, 'error');
      return;
    }
    setIsSaving(true);
    try {
      const created = await createTemplate({
        name: newName.trim(),
        targetRole: newRole,
        description: newDescription.trim() || undefined,
        isDefault: newIsDefault,
        items: payload,
      });
      showToast(`템플릿을 생성했습니다. (항목 ${payload.length}개)`, 'success');
      setIsCreationModalOpen(false);
      setNewName('');
      setNewDescription('');
      setNewItems([]);
      await load();
      await selectTemplate(created.id);
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
    const payload = toSavePayload(editItems);
    if (payload.length === 0) {
      showToast('항목을 1개 이상 남겨 주세요. 항목이 없으면 계획에 반영되지 않습니다.', 'error');
      return;
    }
    const unlinked = findUnlinkedDocumentItem(editItems);
    if (unlinked) {
      showToast(`"${unlinked.title || '제목 없음'}" 항목에 연결할 문서를 선택해 주세요.`, 'error');
      return;
    }
    setIsSaving(true);
    try {
      await updateTemplate(selectedTemplate.id, {
        name: editName.trim(),
        targetRole: editRole,
        description: editDescription.trim() || undefined,
        isDefault: editIsDefault,
        // 서버는 items 가 있으면 기존 항목을 지우고 새로 저장한다.
        // 편집기에서 불러온 값을 그대로 되돌려 보내야 기존 항목이 사라지지 않는다.
        items: payload,
      });
      showToast('변경 내용을 저장했습니다. 기존 계획은 재생성해야 반영됩니다.', 'success');
      setIsEditModalOpen(false);
      await load();
      await selectTemplate(selectedTemplate.id);
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

  const selectedCategories = selectedTemplate ? typeCountsOf(selectedTemplate) : [];

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
            <button className={styles.createBtn} onClick={openCreationModal}><Plus size={16} /> 템플릿 생성</button>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.statsWrapper}>
            <div className={styles.statCard}><LayoutTemplate size={22} /><div><span>전체 템플릿</span><strong>{stats.total}<small>개</small></strong><p>등록된 템플릿 수</p></div></div>
            <div className={styles.statCard}><FileText size={22} /><div><span>총 항목</span><strong>{stats.itemCount}<small>개</small></strong><p>모든 템플릿 항목 수</p></div></div>
            <div className={styles.statCard}><Clock size={22} /><div><span>총 예상 시간</span><strong>{formatMinutes(stats.totalMinutes)}</strong><p>모든 템플릿 합계</p></div></div>
            <div className={styles.statCard}><CircleCheck size={22} /><div><span>기본</span><strong>{stats.defaultCount}<small>개</small></strong><p>기본으로 지정된 템플릿</p></div></div>
          </div>

          <div className={styles.mainLayout}>
            <div className={styles.listCard}>
              <h2>템플릿 목록</h2>
              {/* 검색은 별도 모달에만 있어서 쓰기 어려웠다. 목록 위로 옮긴다 */}
              <div className={styles.searchBox}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="템플릿 검색"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
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
                ) : visibleTemplates.length === 0 ? (
                  <div className={styles.meta}>검색 결과가 없습니다.</div>
                ) : (
                  visibleTemplates.map(t => (
                    <div
                      key={t.id}
                      className={`${styles.template} ${selectedTemplateId === t.id ? styles.selectedTemplate : ''}`}
                      onClick={() => void selectTemplate(t.id)}
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
                        <div className={styles.meta}>{t.itemCount}개 항목 · {formatMinutes(t.totalEstimatedMinutes)}</div>
                        <div className={styles.date}>{formatUpdatedAt(t.updatedAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* 헤더에 이미 생성 버튼이 있다. 목록이 비었을 때만 안내용으로 보여 준다 */}
              {!isLoading && !error && templates.length === 0 && (
                <button className={styles.addMore} onClick={openCreationModal}>
                  <Plus size={16} /> 템플릿 생성
                </button>
              )}
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
                  <h3>{selectedTemplate.name}</h3>
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
                    <div><div>{selectedTemplate.itemCount}</div><div>총 항목</div></div>
                    <div><div>{formatMinutes(selectedTemplate.totalEstimatedMinutes)}</div><div>예상 시간</div></div>
                    <div><div>{durationOf(selectedTemplate.items)}일차</div><div>마지막 일차</div></div>
                    <div><div>{selectedTemplate.isDefault ? '기본' : '일반'}</div><div>지정 상태</div></div>
                  </div>
                  <h4>항목 종류별 개수</h4>
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
                    <button onClick={() => void openEditModal(selectedTemplate)}><Edit2 size={16} /> 편집</button>
                    <button onClick={() => void openApplyModal(selectedTemplate.id)}><RefreshCw size={16} /> 적용</button>
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
              documents={readyDocuments}
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
          <div className={styles.detail}><strong>항목 수:</strong> {selectedTemplate.itemCount}</div>
          <div className={styles.detail}>
            <strong>유형별:</strong>{' '}
            {typeCountsOf(selectedTemplate).map(c => `${c.name} ${c.itemCount}`).join(' · ') || '없음'}
          </div>
          <div className={styles.detail}>
            <strong>총 예상 시간:</strong> {formatMinutes(selectedTemplate.totalEstimatedMinutes)}
          </div>
          <div className={styles.detail}><strong>마지막 일차:</strong> {durationOf(selectedTemplate.items)}일차</div>
          <div className={styles.detail}><strong>설명:</strong> {selectedTemplate.description || '설명이 없습니다.'}</div>
          {isDetailLoading && <div className={styles.detail}>항목을 불러오는 중...</div>}
          {(selectedTemplate.items ?? [])
            .slice()
            .sort((a, b) => a.dayIndex - b.dayIndex || a.sortOrder - b.sortOrder)
            .map(item => (
              <div key={item.id} className={styles.templateItem}>
                <div>
                  {item.dayIndex}일차 · {item.title}
                  {item.documentId && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {' '}· 문서 {documentTitleOf(item.documentId, readyDocuments)}
                    </span>
                  )}
                </div>
                <span>
                  {getDisplayLabel(item.type)}
                  {item.estimatedMinutes != null && ` · ${item.estimatedMinutes}분`}
                </span>
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
          <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.7, marginTop: 0, marginBottom: '14px' }}>
            여기서 저장한 뒤 상세 화면의 &quot;적용&quot; 버튼을 누르면 기존 계획에도 반영됩니다.
          </p>
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
              documents={readyDocuments}
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

      {/* 5. 템플릿 삭제 */}
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

      {/* 6. 문서로 AI 템플릿 생성 — 초안을 검토·수정한 뒤 저장한다 */}
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

              <TemplateItemsEditor
                items={draftItems}
                maxDay={genPlanDays}
                disabled={isSaving}
                documents={readyDocuments}
                onChange={setDraftItems}
              />

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

      {/* 7. 템플릿 일괄 적용 */}
      {isApplyModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsApplyModalOpen(false)}
          title="템플릿 적용"
          subtitle={`"${selectedTemplate.name}" 템플릿의 최신 내용을 기존 계획에 반영합니다.`}
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsApplyModalOpen(false)} disabled={isApplying}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isApplying}
                onClick={() => void handleApply()}
                disabled={affectedUsers.length === 0}
              >
                {affectedUsers.length}명에게 적용
              </ModalPrimaryButton>
            </>
          }
        >
          {isApplyLoading ? (
            <div style={{ padding: '20px', fontSize: '14px', color: '#64748b' }}>영향 받는 사용자를 확인하는 중...</div>
          ) : affectedUsers.length === 0 ? (
            <div style={{ padding: '20px', fontSize: '14px', color: '#64748b' }}>
              이 템플릿으로 생성된 활성 계획이 없습니다. 적용할 대상이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '12px 14px', borderRadius: '10px', fontSize: '13px', lineHeight: 1.7,
                backgroundColor: '#eff6ff', border: '1px solid #dbeafe', color: '#1e40af',
              }}>
                아래 {affectedUsers.length}명의 30일 계획이 최신 템플릿으로 재생성됩니다.
              </div>

              <div style={{
                maxHeight: '200px', overflowY: 'auto',
                border: '1px solid #e2e8f0', borderRadius: '10px',
              }}>
                {affectedUsers.map((user, index) => (
                  <div
                    key={user.userId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                      borderTop: index === 0 ? 'none' : '1px solid #f1f5f9', fontSize: '13px',
                    }}
                  >
                    <UsersRound size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                    <span style={{ color: '#0f172a' }}>{user.name ?? '이름 없음'}</span>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>{user.email}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: user.planId ? '#64748b' : '#dc2626' }}>
                      {user.planId ? '재생성' : '새로 생성'}
                    </span>
                  </div>
                ))}
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                <input
                  type="checkbox"
                  checked={applyKeepCompleted}
                  onChange={(e) => setApplyKeepCompleted(e.target.checked)}
                  disabled={isApplying}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  완료된 항목 유지<br />
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    체크하면 이미 완료한 항목은 새 계획에서도 완료 상태로 유지됩니다.
                  </span>
                </span>
              </label>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
