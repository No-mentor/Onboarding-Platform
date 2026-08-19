'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Search, MoreVertical, LayoutTemplate, UsersRound, FileText, CircleCheck, Crown, ChevronDown, Bell, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import { getTemplates, createTemplate, deleteTemplate, TemplateResponse } from '@/lib/api';
import styles from './templates.module.css';

type TemplateCategory = {
  name: string;
  itemCount: number;
};

type OnboardingTemplate = {
  id: string;
  name: string;
  role: string;
  status: string;
  items: number;
  team: string;
  date: string;
  description: string;
  duration: number;
  usageCount: number;
  categories: TemplateCategory[];
};

const DEFAULT_MOCK_TEMPLATES: OnboardingTemplate[] = [
  {
    id: 'marketing-new-hire',
    name: '마케팅 신입 기본 템플릿',
    role: 'NEW_HIRE',
    status: 'IN_USE',
    items: 18,
    team: '마케팅팀 인수인계',
    date: '수정일 2024. 05. 13',
    description: '마케팅팀 신입 구성원을 위한 30일 온보딩 템플릿입니다.',
    duration: 30,
    usageCount: 2,
    categories: [
      { name: '회사 이해', itemCount: 4 },
      { name: '마케팅 프로세스', itemCount: 5 },
      { name: '주요 툴 및 시스템', itemCount: 3 },
      { name: '주요 프로젝트', itemCount: 3 },
      { name: '커뮤니케이션', itemCount: 2 },
      { name: '참고 자료', itemCount: 1 },
    ],
  },
  {
    id: 'development-new-hire',
    name: '개발팀 신입 온보딩',
    role: 'NEW_HIRE',
    status: 'IN_USE',
    items: 22,
    team: '개발팀 인수인계',
    date: '수정일 2024. 05. 10',
    description: '개발 환경과 협업 방식을 빠르게 익히기 위한 신입 템플릿입니다.',
    duration: 30,
    usageCount: 3,
    categories: [
      { name: '개발 환경 설정', itemCount: 4 },
      { name: '서비스 구조', itemCount: 5 },
      { name: '개발 규칙', itemCount: 4 },
      { name: '배포 절차', itemCount: 3 },
      { name: '협업 방식', itemCount: 3 },
      { name: '참고 자료', itemCount: 3 },
    ],
  },
  {
    id: 'leader-transition',
    name: '팀장 인수인계 전환',
    role: 'MANAGER',
    status: 'DRAFT',
    items: 14,
    team: '리더십 전환',
    date: '수정일 2024. 05. 08',
    description: '새로운 팀장이 조직과 업무를 안정적으로 인수하기 위한 템플릿입니다.',
    duration: 21,
    usageCount: 0,
    categories: [
      { name: '조직 및 인력 현황', itemCount: 3 },
      { name: '핵심 KPI 파악', itemCount: 4 },
      { name: '예산 및 프로젝트 관리', itemCount: 4 },
      { name: '이해관계자 1:1', itemCount: 3 },
    ],
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<OnboardingTemplate[]>(DEFAULT_MOCK_TEMPLATES);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);

  // Create form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRole, setNewRole] = useState('NEW_HIRE');
  const [newDuration, setNewDuration] = useState(30);

  const fetchTemplatesList = async () => {
    try {
      setIsLoading(true);
      const res = await getTemplates();
      if (res && res.templates && res.templates.length > 0) {
        const mapped: OnboardingTemplate[] = res.templates.map((t: TemplateResponse, idx: number) => ({
          id: t.id || `tpl-${idx + 1}`,
          name: t.title,
          role: t.role || 'NEW_HIRE',
          status: 'IN_USE',
          items: t.sections ? t.sections.reduce((acc: number, s: any) => acc + (s.items?.length || 0), 0) : 15,
          team: '마케팅팀 인수인계',
          date: t.updatedAt ? `수정일 ${new Date(t.updatedAt).toLocaleDateString()}` : '수정일 2024. 05. 13',
          description: t.description || '맞춤 온보딩 템플릿',
          duration: t.durationDays || 30,
          usageCount: 1,
          categories: t.sections && t.sections.length > 0 ? t.sections.map((s: any) => ({ name: s.title, itemCount: s.items?.length || 3 })) : [{ name: '기본 섹션', itemCount: 5 }],
        }));
        setTemplates(mapped);
      }
    } catch (err) {
      console.log('실제 템플릿 조회 실패 (모의 데이터 유지):', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplatesList();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      showToast('템플릿 제목을 입력해 주세요.', 'error');
      return;
    }

    try {
      setIsCreating(true);
      await createTemplate({
        title: newTitle.trim(),
        description: newDesc.trim(),
        role: newRole,
        durationDays: newDuration,
      });
      showToast('새 템플릿이 성공적으로 등록되었습니다.', 'success');
      setNewTitle('');
      setNewDesc('');
      setIsCreateModalOpen(false);
      await fetchTemplatesList();
    } catch (err: any) {
      showToast(err?.message || '템플릿 등록 실패', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    try {
      if (!selectedTemplate.id.startsWith('marketing-') && !selectedTemplate.id.startsWith('development-') && !selectedTemplate.id.startsWith('leader-')) {
        await deleteTemplate(selectedTemplate.id);
      }
      setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplate.id));
      showToast('템플릿이 삭제되었습니다.', 'success');
      setIsDeleteModalOpen(false);
      setIsDetailModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || '템플릿 삭제 실패', 'error');
    }
  };

  const filteredTemplates = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return templates.filter((tpl) => {
      const matchesTab = activeTab === 'ALL' || tpl.role === activeTab;
      const matchesSearch = !keyword || tpl.name.toLowerCase().includes(keyword) || tpl.description.toLowerCase().includes(keyword);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchTerm, templates]);

  return (
    <div className={styles.container}>
      <CommonSidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>온보딩 템플릿 관리</h1>
            <p>직무별 표준 인수인계 템플릿을 생성하고 관리합니다.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.createButton} onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={16} /> 새 템플릿 생성
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <section className={styles.filterSection}>
          <div className={styles.tabs}>
            {['ALL', 'NEW_HIRE', 'MEMBER', 'MANAGER', 'ADMIN'].map((tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'ALL' ? '전체' : getDisplayLabel(tab)}
              </button>
            ))}
          </div>

          <div className={styles.searchBox}>
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="템플릿 이름 또는 설명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </section>

        {/* Template Cards Grid */}
        <section className={styles.grid}>
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className={styles.card}
              onClick={() => {
                setSelectedTemplate(tpl);
                setIsDetailModalOpen(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.roleTag}>{getDisplayLabel(tpl.role)}</span>
                  <h3 className={styles.cardTitle}>{tpl.name}</h3>
                </div>
                <button
                  className={styles.deleteIconBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplate(tpl);
                    setIsDeleteModalOpen(true);
                  }}
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <p className={styles.cardDesc}>{tpl.description}</p>

              <div className={styles.cardMeta}>
                <span>📅 {tpl.duration}일 로드맵</span>
                <span>📋 {tpl.items}개 항목</span>
                <span>👥 {tpl.usageCount}회 적용</span>
              </div>

              <div className={styles.categoryList}>
                {tpl.categories.slice(0, 3).map((c, i) => (
                  <span key={i} className={styles.categoryChip}>
                    {c.name} ({c.itemCount})
                  </span>
                ))}
                {tpl.categories.length > 3 && (
                  <span className={styles.categoryChip}>+{tpl.categories.length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* MODALS */}

      {/* 1. Create Template Modal */}
      {isCreateModalOpen && (
        <Modal
          open
          onClose={() => setIsCreateModalOpen(false)}
          title="새 온보딩 템플릿 생성"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsCreateModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton loading={isCreating} onClick={handleCreate}>
                템플릿 생성
              </ModalPrimaryButton>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>템플릿 명</label>
              <input
                type="text"
                placeholder="예: 마케팅팀 신입 30일 기본 온보딩"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>대상 역할</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              >
                <option value="NEW_HIRE">신입 구성원 (NEW_HIRE)</option>
                <option value="MEMBER">일반 구성원 (MEMBER)</option>
                <option value="MANAGER">관리 담당자 (MANAGER)</option>
                <option value="ADMIN">관리자 (ADMIN)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>기간 (일수)</label>
              <input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                min={7}
                max={90}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>설명</label>
              <textarea
                placeholder="템플릿의 목적과 주요 대상 업무를 기술하세요."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px', resize: 'vertical' }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Detail Modal */}
      {isDetailModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsDetailModalOpen(false)}
          title="온보딩 템플릿 상세"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDetailModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setIsDetailModalOpen(false);
                  router.push('/30day-plan');
                }}
              >
                30일 계획에서 확인
              </ModalPrimaryButton>
            </>
          }
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={styles.roleTag}>{getDisplayLabel(selectedTemplate.role)}</span>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedTemplate.name}</h3>
            </div>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 16px' }}>{selectedTemplate.description}</p>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>포함된 온보딩 섹션:</div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: '1.7' }}>
                {selectedTemplate.categories.map((c, i) => (
                  <li key={i}>{c.name} - {c.itemCount}개 과제</li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setIsDetailModalOpen(false); router.push('/members'); }}
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                👥 구성원에게 적용하기
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Delete Modal */}
      {isDeleteModalOpen && selectedTemplate && (
        <Modal
          open
          onClose={() => setIsDeleteModalOpen(false)}
          title="템플릿 삭제"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDeleteModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalDangerButton onClick={handleDelete}>삭제하기</ModalDangerButton>
            </>
          }
        >
          <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
            정말로 <strong>{selectedTemplate.name}</strong> 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
        </Modal>
      )}
    </div>
  );
}