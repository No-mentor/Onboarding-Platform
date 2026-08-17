'use client';
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, MoreVertical } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import styles from './templates.module.css';

export default function TemplatesPage() {
  const { run, isPending } = useModalAction();
  const [selectedTemplateId, setSelectedTemplateId] = useState(1);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const templates = [
    { id: 1, name: '마케팅 신입 기본', role: 'NEW_HIRE', status: '사용 중', items: 18, team: '마케팅팀 인수인계', date: '우정팅 2024.05.13' },
    { id: 2, name: '개발팀 신입', role: 'NEW_HIRE', status: '사용 중', items: 22, team: '개발팀 인수인계', date: '우정팅 2024.05.10' },
    { id: 3, name: '팀장 전환', role: 'MANAGER', status: '도입', items: 14, team: '리더십 전환', date: '우정팅 2024.05.08' },
  ];

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
            <div><div>3</div><div>개</div><div>활성 템플릿 수</div></div>
            <div><div>3</div><div>개</div><div>다양한 역할 템플릿</div></div>
            <div><div>54</div><div>개</div><div>모든 템플릿 항목 수</div></div>
            <div><div>2</div><div>개</div><div>사용 중인 템플릿</div></div>
          </div>

          <div className={styles.mainLayout}>
            <div className={styles.listCard}>
            <h2>템플릿 목록</h2>
            <div className={styles.templates}>
              {templates.map(t => (
                <div key={t.id} className={styles.template} onClick={() => setSelectedTemplateId(t.id)}>
                  <div className={styles.info}>
                    <div className={styles.name}>{t.name} <span className={styles.role}>{t.role}</span> <span className={styles.status}>{t.status}</span></div>
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
              <button className={styles.preview} onClick={() => setIsDetailsModalOpen(true)}>미리보기</button>
              {selectedTemplate && (
                <>
                  <h3>{selectedTemplate.name}</h3>
                  <div className={styles.badge}>{selectedTemplate.role}</div>
                  <div className={styles.green}>{selectedTemplate.status}</div>
                  <p className={styles.desc}>{selectedTemplate.team}<br/>운영 날짜: 2024.05.01 ~ 운영 2024.05.13</p>
                  <div className={styles.stats2}>
                    <div><div>18</div><div>총항목</div></div>
                    <div><div>6</div><div>카테고리</div></div>
                    <div><div>30일</div><div>길이</div></div>
                    <div><div>2</div><div>사용중</div></div>
                  </div>
                  <h4>카테고리 미리보기</h4>
                  <div className={styles.categories}>
                    <div><span>1</span> 회사 이해 <span className={styles.count}>4개 항목</span></div>
                    <div><span>2</span> 마케팅 프로세스 <span className={styles.count}>5개 항목</span></div>
                    <div><span>3</span> 주요 툴 및 시스템 <span className={styles.count}>3개 항목</span></div>
                    <div><span>4</span> 주요 프로젝트 <span className={styles.count}>3개 항목</span></div>
                    <div><span>5</span> 커뮤니케이션 <span className={styles.count}>2개 항목</span></div>
                    <div><span>6</span> 첫날 자료 <span className={styles.count}>1개 항목</span></div>
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
              <option>NEW_HIRE</option>
              <option>MEMBER</option>
              <option>MANAGER</option>
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
          title="{selectedTemplate.name}"
          footer={<ModalSecondaryButton onClick={() => setIsDetailsModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.detail}><strong>역할:</strong> {selectedTemplate.role}</div>
          <div className={styles.detail}><strong>상태:</strong> {selectedTemplate.status}</div>
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
            <div className={styles.member}>김세원 (NEW_HIRE)</div>
            <div className={styles.member}>이민수 (NEW_HIRE)</div>
            <div className={styles.member}>최서연 (MEMBER)</div>
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
