'use client';
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, MoreVertical, LayoutTemplate, UsersRound, FileText, CircleCheck, Crown } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { getDisplayLabel } from '@/lib/display-labels';
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

const MOCK_TEMPLATES: OnboardingTemplate[] = [
  {
    id: 'marketing-new-hire',
    name: '마케팅 신입 기본',
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
    name: '개발팀 신입',
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
    name: '팀장 전환',
    role: 'MANAGER',
    status: 'DRAFT',
    items: 14,
    team: '리더십 전환',
    date: '수정일 2024. 05. 08',
    description: '새로운 팀장이 조직과 업무를 안정적으로 인수하기 위한 템플릿입니다.',
    duration: 21,
    usageCount: 0,
    categories: [
      { name: '조직 이해', itemCount: 3 },
      { name: '팀원 면담', itemCount: 3 },
      { name: '업무 현황', itemCount: 3 },
      { name: '목표 수립', itemCount: 2 },
      { name: '보고 체계', itemCount: 2 },
      { name: '참고 자료', itemCount: 1 },
    ],
  },
];

export default function TemplatesPage() {
  const { run, isPending } = useModalAction();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(MOCK_TEMPLATES[0].id);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [templates] = useState<OnboardingTemplate[]>(MOCK_TEMPLATES);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

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
            <div className={styles.statCard}><LayoutTemplate size={22} /><div><span>전체 템플릿</span><strong>3<small>개</small></strong><p>활성 템플릿 수</p></div></div>
            <div className={styles.statCard}><UsersRound size={22} /><div><span>역할</span><strong>3<small>개</small></strong><p>다양한 역할 템플릿</p></div></div>
            <div className={styles.statCard}><FileText size={22} /><div><span>총 항목</span><strong>54<small>개</small></strong><p>모든 템플릿 항목 수</p></div></div>
            <div className={styles.statCard}><CircleCheck size={22} /><div><span>사용 중</span><strong>2<small>개</small></strong><p>사용 중인 템플릿</p></div></div>
          </div>

          <div className={styles.mainLayout}>
            <div className={styles.listCard}>
            <h2>템플릿 목록</h2>
            <div className={styles.templates}>
              {templates.map(t => (
                <div key={t.id} className={`${styles.template} ${selectedTemplateId === t.id ? styles.selectedTemplate : ''}`} onClick={() => setSelectedTemplateId(t.id)}>
                  <div className={`${styles.templateIcon} ${t.role === 'MANAGER' ? styles.managerIcon : ''}`}>
                    {t.role === 'MANAGER' ? <Crown size={20} /> : <UsersRound size={20} />}
                  </div>
                  <div className={styles.info}>
                    <div className={styles.name}>{t.name} <span className={styles.role}>{getDisplayLabel(t.role)}</span> <span className={t.status === 'DRAFT' ? styles.draftStatus : styles.status}>{getDisplayLabel(t.status)}</span></div>
                    <div className={styles.meta}>{t.items}개 항목 · {t.team}</div>
                    <div className={styles.date}>{t.date}</div>
                  </div>
                  <button className={styles.menu} onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplateId(t.id);
                    setIsActionsMenuOpen(true);
                  }}><MoreVertical size={16} /></button>
                </div>
              ))}
            </div>
            <button className={styles.addMore} onClick={() => setIsCreationModalOpen(true)}><Plus size={16} /> 템플릿 생성</button>
            </div>

            <aside className={styles.details}>
              <div className={styles.detailsHeader}>
                <h2>템플릿 상세</h2>
                <button className={styles.preview} onClick={() => setIsDetailsModalOpen(true)}>미리보기</button>
              </div>
              {selectedTemplate && (
                <>
                  <h3>{selectedTemplate.name}</h3>
                  <div className={styles.badge}>{getDisplayLabel(selectedTemplate.role)}</div>
                  <div className={selectedTemplate.status === 'DRAFT' ? styles.draftText : styles.green}>{getDisplayLabel(selectedTemplate.status)}</div>
                  <p className={styles.desc}>{selectedTemplate.description}<br/>{selectedTemplate.team} · {selectedTemplate.date}</p>
                  <div className={styles.stats2}>
                    <div><div>{selectedTemplate.items}</div><div>총 항목</div></div>
                    <div><div>{selectedTemplate.categories.length}</div><div>카테고리</div></div>
                    <div><div>{selectedTemplate.duration}일</div><div>권장 기간</div></div>
                    <div><div>{selectedTemplate.usageCount}</div><div>사용 중</div></div>
                  </div>
                  <h4>카테고리 미리보기</h4>
                  <div className={styles.categories}>
                    {selectedTemplate.categories.map((category, index) => (
                      <div key={category.name}><span>{index + 1}</span> {category.name} <span className={styles.count}>{category.itemCount}개 항목</span></div>
                    ))}
                  </div>
                  <div className={styles.actions}>
                    <button onClick={() => setIsCategoriesModalOpen(true)}><Edit2 size={16} /> 편집</button>
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
                loading={isPending('templates-0')}
                onClick={() => run('templates-0', '생성이 완료되었습니다.', () => setIsCreationModalOpen(false))}
              >
                생성
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>템플릿명</label>
            <input type="text" placeholder="새로운 템플릿 이름" className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>대상 역할</label>
            <select className={styles.select}>
              <option value="NEW_HIRE">신입 구성원</option>
              <option value="MEMBER">구성원</option>
              <option value="MANAGER">관리 담당자</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>설명</label>
            <textarea placeholder="템플릿 설명" className={styles.textarea} rows={3} />
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
              <div>{t.name} - {getDisplayLabel(t.role)}</div>
              <span>{getDisplayLabel(t.status)}</span>
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
          footer={<ModalSecondaryButton onClick={() => setIsDetailsModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.detail}><strong>역할:</strong> {getDisplayLabel(selectedTemplate.role)}</div>
          <div className={styles.detail}><strong>상태:</strong> {getDisplayLabel(selectedTemplate.status)}</div>
          <div className={styles.detail}><strong>항목 수:</strong> {selectedTemplate.items}</div>
          <div className={styles.detail}><strong>팀:</strong> {selectedTemplate.team}</div>
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
              <ModalSecondaryButton onClick={() => setIsCategoriesModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('templates-1')}
                onClick={() => run('templates-1', '변경 내용을 저장했습니다.', () => setIsCategoriesModalOpen(false))}
              >
                저장
              </ModalPrimaryButton>
            </>
          }
        >
          {['회사 이해', '마케팅 프로세스', '주요 툴 및 시스템', '주요 프로젝트', '커뮤니케이션', '첫날 자료'].map((cat, i) => (
            <div key={i} className={styles.categoryItem}>
              <span>{i + 1}. {cat}</span>
              <button className={styles.editBtn}><Edit2 size={14} /></button>
            </div>
          ))}
        </Modal>
      )}

      {/* 5. Template Members Modal */}
      {isMembersModalOpen && (
        <Modal
          open
          onClose={() => setIsMembersModalOpen(false)}
          title="템플릿 멤버"
          footer={<ModalSecondaryButton onClick={() => setIsMembersModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.memberList}>
            <div className={styles.member}>김세원 (신입 구성원)</div>
            <div className={styles.member}>이민수 (신입 구성원)</div>
            <div className={styles.member}>최서연 (구성원)</div>
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
                loading={isPending('templates-2')}
                onClick={() => run('templates-2', '삭제했습니다.', () => setIsStatusModalOpen(false))}
              >
                삭제
              </ModalDangerButton>
            </>
          }
        >
          <p>‘{selectedTemplate.name}’을(를) 삭제하시겠습니까?</p>
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
