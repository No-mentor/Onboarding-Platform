'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, Archive, BarChart3, Bell, Building2, Check, ChevronDown, Copy, FileText, Grid2X2, HelpCircle, Image as ImageIcon, LockKeyhole, Mail, Pencil, RefreshCw, Settings, ShieldCheck, Trash2, Upload, Users } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalDangerButton, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getWorkspaceId } from '@/lib/storage';
import { updateWorkspace } from '@/lib/api';
import styles from './workspace-settings.module.css';

const WORKSPACES = ['마케팅팀 인수인계', '운영팀 인수인계', '디자인팀 인수인계'];
type NotificationKey = 'invite' | 'document' | 'weekly' | 'security' | 'plan';
type NotificationSettings = Record<NotificationKey, boolean>;
const NOTIFICATION_ITEMS: Array<{ key: NotificationKey; title: string; description: string; icon: React.ElementType }> = [
  { key: 'invite', title: '새 멤버 초대 알림', description: '새로운 멤버가 워크스페이스에 초대되었을 때', icon: Bell },
  { key: 'document', title: '문서 처리 실패 알림', description: '문서 처리 중 오류가 발생했을 때', icon: FileText },
  { key: 'weekly', title: '주간 진행 요약 메일', description: '주간 진행 상황을 요약한 메일을 받을 때', icon: Mail },
  { key: 'security', title: '보안 이벤트 알림', description: '로그인, 권한 변경 등 보안 관련 이벤트 발생 시', icon: ShieldCheck },
  { key: 'plan', title: '계획 재생성 완료 알림', description: 'AI가 계획 재생성을 완료했을 때', icon: RefreshCw },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`} onClick={onChange}><span /></button>;
}

export default function WorkspaceSettingsPage() {
  const { showToast } = useToast();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [workspaceName, setWorkspaceName] = useState('마케팅팀 인수인계');
  const [draftName, setDraftName] = useState(workspaceName);
  const [description, setDescription] = useState('마케팅팀 업무 인수인계를 위한 AI 워크스페이스');
  const [draftDescription, setDraftDescription] = useState(description);
  const [slug, setSlug] = useState('marketing-onboarding');
  const [draftSlug, setDraftSlug] = useState(slug);
  const [selectedWorkspace, setSelectedWorkspace] = useState(WORKSPACES[0]);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isLogoOpen, setIsLogoOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [brandColor, setBrandColor] = useState('#0765FC');
  const [applyToSidebar, setApplyToSidebar] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>({ invite: true, document: true, weekly: true, security: false, plan: true });
  const [publicScope, setPublicScope] = useState('워크스페이스 전체');
  const [defaultRole, setDefaultRole] = useState('신입 구성원');
  const [domains, setDomains] = useState(['company.com', 'partner.co.kr']);
  const [domainInput, setDomainInput] = useState('');
  const [inviteLinkEnabled, setInviteLinkEnabled] = useState(true);
  const [linkExpiry, setLinkExpiry] = useState('7일');

  const openInfoModal = () => { setDraftName(workspaceName); setDraftDescription(description); setDraftSlug(slug); setIsInfoOpen(true); };
  const saveInfo = async () => {
    if (!draftName.trim() || !draftSlug.trim()) { showToast('워크스페이스 이름과 슬러그를 입력해 주세요.', 'error'); return; }
    setIsSaving(true);
    try {
      const workspaceId = getWorkspaceId();
      if (workspaceId) await updateWorkspace(workspaceId, draftName.trim());
      setWorkspaceName(draftName.trim()); setDescription(draftDescription.trim()); setSlug(draftSlug.trim()); setIsInfoOpen(false);
      showToast('워크스페이스 정보를 저장했습니다.', 'success');
    } catch { showToast('정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error'); }
    finally { setIsSaving(false); }
  };
  const copyText = async (value: string, label: string) => { try { await navigator.clipboard.writeText(value); showToast(`${label}을(를) 복사했습니다.`, 'success'); } catch { showToast('복사하지 못했습니다.', 'error'); } };
  const handleLogoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/png', 'image/svg+xml'].includes(file.type)) { showToast('PNG 또는 SVG 파일만 업로드할 수 있습니다.', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('파일 크기는 2MB 이하여야 합니다.', 'error'); return; }
    const reader = new FileReader(); reader.onload = () => setLogoPreview(String(reader.result)); reader.readAsDataURL(file);
  };
  const addDomain = () => {
    const normalized = domainInput.trim().toLowerCase().replace(/^@/, '');
    if (!normalized || !normalized.includes('.')) { showToast('올바른 이메일 도메인을 입력해 주세요.', 'error'); return; }
    if (!domains.includes(normalized)) setDomains((items) => [...items, normalized]); setDomainInput('');
  };

  return (
    <div className={styles.layout}>
      <CommonSidebar />
      <main className={styles.main}>
        <header className={styles.header}>
          <div><div className={styles.titleRow}><h1>워크스페이스</h1><Settings size={25} /></div><p>워크스페이스 정보와 접근 설정을 관리하세요.</p></div>
          <div className={styles.headerActions}>
            <div className={styles.workspaceMenuWrap}><button className={styles.workspaceSelector} onClick={() => setWorkspaceMenuOpen((open) => !open)} aria-expanded={workspaceMenuOpen}><Building2 size={16} /><span>{selectedWorkspace}</span><ChevronDown size={16} /></button>{workspaceMenuOpen && <div className={styles.workspaceMenu}>{WORKSPACES.map((workspace) => <button key={workspace} onClick={() => { setSelectedWorkspace(workspace); setWorkspaceMenuOpen(false); showToast(`${workspace}(으)로 전환했습니다.`, 'success'); }}><span>{workspace}</span>{workspace === selectedWorkspace && <Check size={16} />}</button>)}</div>}</div>
            <button className={styles.roundButton} aria-label="알림" onClick={() => showToast('새 알림이 없습니다.', 'success')}><Bell size={19} /></button><button className={styles.roundButton} aria-label="도움말" onClick={() => showToast('워크스페이스 설정 도움말을 확인했습니다.', 'success')}><HelpCircle size={19} /></button>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.summaryGrid}>
            <div className={styles.summaryCard}><span className={styles.summaryIcon}><Building2 /></span><div><small>워크스페이스 이름</small><strong>{workspaceName}</strong></div></div>
            <button className={styles.summaryCard} onClick={() => showToast('현재 멤버는 12명입니다.', 'success')}><span className={styles.summaryIcon}><Users /></span><div><small>멤버 수</small><strong>12<em>명</em></strong></div></button>
            <button className={styles.summaryCard} onClick={() => showToast('워크스페이스 문서는 48개입니다.', 'success')}><span className={styles.summaryIcon}><FileText /></span><div><small>문서 수</small><strong>48<em>개</em></strong></div></button>
            <button className={styles.summaryCard} onClick={() => showToast('활성 템플릿은 3개입니다.', 'success')}><span className={styles.summaryIcon}><Grid2X2 /></span><div><small>활성 템플릿</small><strong>3<em>개</em></strong></div></button>
          </section>

          <div className={styles.settingsGrid}>
            <section className={`${styles.card} ${styles.basicCard}`}><h2>기본 정보</h2><div className={styles.basicBody}>
              <div className={styles.workspaceLogo} style={{ backgroundColor: brandColor }}>{logoPreview ? <Image src={logoPreview} alt="워크스페이스 로고" width={92} height={92} unoptimized /> : <BarChart3 size={44} />}</div>
              <dl className={styles.infoList}><div><dt>워크스페이스 이름</dt><dd>{workspaceName}</dd></div><div><dt>설명</dt><dd>{description}</dd></div><div><dt>소유자</dt><dd>최서연</dd></div><div><dt>생성일</dt><dd>2026. 08. 10</dd></div><div><dt>워크스페이스 ID</dt><dd>ws_8f3d2a1c <button onClick={() => copyText('ws_8f3d2a1c', '워크스페이스 ID')} aria-label="워크스페이스 ID 복사"><Copy size={15} /></button></dd></div><div><dt>슬러그</dt><dd>{slug} <button onClick={() => copyText(slug, '슬러그')} aria-label="슬러그 복사"><Copy size={15} /></button></dd></div></dl>
            </div><div className={styles.cardActions}><button onClick={openInfoModal}><Pencil size={16} /> 정보 수정</button><button onClick={() => setIsLogoOpen(true)}><ImageIcon size={16} /> 로고 변경</button></div></section>

            <div className={styles.sideCards}><section className={styles.card}><h2>접근 및 보안</h2><dl className={styles.compactList}><div><dt>공개 범위</dt><dd>{publicScope}</dd></div><div><dt>기본 초대 역할</dt><dd><span className={styles.tag}>{defaultRole}</span></dd></div><div><dt>허용 이메일 도메인</dt><dd className={styles.domainTags}>{domains.map((domain) => <span key={domain}>{domain}</span>)}</dd></div><div><dt>초대 링크</dt><dd className={styles.activeText}>{inviteLinkEnabled ? '활성화' : '비활성화'}</dd></div><div><dt>링크 만료</dt><dd>{linkExpiry}</dd></div></dl><button className={styles.outlineAction} onClick={() => setIsAccessOpen(true)}><LockKeyhole size={16} /> 접근 설정</button></section>
              <section className={styles.card}><h2>알림 및 운영</h2><div className={styles.notificationPreview}>{NOTIFICATION_ITEMS.slice(0, 3).map((item) => { const Icon = item.icon; return <div key={item.key}><span><Icon size={17} />{item.title}</span><Toggle checked={notifications[item.key]} onChange={() => setNotifications((settings) => ({ ...settings, [item.key]: !settings[item.key] }))} label={item.title} /></div>; })}</div><button className={styles.outlineAction} onClick={() => setIsNotificationsOpen(true)}><Bell size={16} /> 알림 설정</button></section></div>
          </div>

          <section className={styles.dangerZone}><div><h2>위험 작업</h2><p>보관하면 워크스페이스가 읽기 전용으로 변경되며, 삭제하면 모든 데이터가 영구적으로 제거됩니다.</p></div><div><button className={styles.archiveButton} onClick={() => setIsArchiveOpen(true)}><Archive size={16} /> 워크스페이스 보관</button><button className={styles.deleteButton} onClick={() => { setDeleteConfirmation(''); setIsDeleteOpen(true); }}><Trash2 size={16} /> 워크스페이스 삭제</button></div></section>
        </div>
      </main>

      <Modal open={isInfoOpen} onClose={() => setIsInfoOpen(false)} title="워크스페이스 정보 수정" footer={<><ModalSecondaryButton onClick={() => setIsInfoOpen(false)}>취소</ModalSecondaryButton><ModalPrimaryButton loading={isSaving} onClick={saveInfo}>저장하기</ModalPrimaryButton></>}><div className={styles.formStack}><label>워크스페이스 이름<input value={draftName} onChange={(event) => setDraftName(event.target.value)} /></label><label>설명<input value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} /></label><label>슬러그<input value={draftSlug} onChange={(event) => setDraftSlug(event.target.value.replace(/[^a-z0-9-]/g, ''))} /></label><label>워크스페이스 ID<input value="ws_8f3d2a1c" readOnly /></label></div></Modal>

      <Modal open={isLogoOpen} onClose={() => setIsLogoOpen(false)} title="로고 변경" footer={<><ModalSecondaryButton onClick={() => setIsLogoOpen(false)}>취소</ModalSecondaryButton><ModalPrimaryButton onClick={() => { setIsLogoOpen(false); showToast('로고 설정을 적용했습니다.', 'success'); }}>적용하기</ModalPrimaryButton></>}><div className={styles.logoModalBody}><label>현재 로고</label><div className={styles.currentLogo}>{logoPreview ? <Image src={logoPreview} alt="새 로고 미리보기" width={96} height={96} unoptimized /> : <BarChart3 size={42} style={{ color: brandColor }} />}</div><label>로고 파일 업로드</label><button className={styles.uploadBox} onClick={() => uploadRef.current?.click()}><Upload size={20} /><strong>로고 파일 업로드</strong><span>PNG, SVG 파일을 권장합니다. (최대 2MB)</span></button><input ref={uploadRef} type="file" accept="image/png,image/svg+xml" hidden onChange={handleLogoFile} /><label>브랜드 포인트 색상</label><div className={styles.colorOptions}>{['#0765FC', '#2563EB', '#0F4C9A'].map((color) => <button key={color} className={brandColor === color ? styles.colorActive : ''} style={{ backgroundColor: color }} onClick={() => setBrandColor(color)} aria-label={`${color} 색상 선택`}>{brandColor === color && <Check size={14} />}</button>)}</div><div className={styles.toggleRow}><span>사이드바 아이콘에도 적용</span><Toggle checked={applyToSidebar} onChange={() => setApplyToSidebar((value) => !value)} label="사이드바 아이콘에도 적용" /></div></div></Modal>

      <Modal open={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} title="알림 설정" footer={<><ModalSecondaryButton onClick={() => setIsNotificationsOpen(false)}>취소</ModalSecondaryButton><ModalPrimaryButton onClick={() => { setIsNotificationsOpen(false); showToast('알림 설정을 저장했습니다.', 'success'); }}>저장하기</ModalPrimaryButton></>}><div className={styles.notificationModalList}>{NOTIFICATION_ITEMS.map((item) => { const Icon = item.icon; return <div key={item.key}><Icon size={20} /><span><strong>{item.title}</strong><small>{item.description}</small></span><Toggle checked={notifications[item.key]} onChange={() => setNotifications((settings) => ({ ...settings, [item.key]: !settings[item.key] }))} label={item.title} /></div>; })}</div><p className={styles.modalHint}>알림은 이메일 또는 앱 내 알림으로 받아보실 수 있습니다.</p></Modal>

      <Modal open={isAccessOpen} onClose={() => setIsAccessOpen(false)} title="접근 설정" closeOnBackdrop={false} footer={<><ModalSecondaryButton onClick={() => setIsAccessOpen(false)}>취소</ModalSecondaryButton><ModalPrimaryButton onClick={() => { setIsAccessOpen(false); showToast('접근 설정을 저장했습니다.', 'success'); }}>설정 저장</ModalPrimaryButton></>}><div className={styles.accessForm}><label><span>공개 범위</span><select value={publicScope} onChange={(event) => setPublicScope(event.target.value)}><option>워크스페이스 전체</option><option>초대된 멤버만</option><option>관리자만</option></select></label><label><span>기본 초대 역할</span><select value={defaultRole} onChange={(event) => setDefaultRole(event.target.value)}><option>신입 구성원</option><option>구성원</option><option>관리 담당자</option></select></label><label><span>허용 이메일 도메인</span><div className={styles.domainEditor}><div>{domains.map((domain) => <button key={domain} onClick={() => setDomains((items) => items.filter((item) => item !== domain))}>{domain} ×</button>)}</div><input value={domainInput} onChange={(event) => setDomainInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addDomain(); } }} placeholder="도메인 추가 후 Enter" /></div></label><div className={styles.accessToggle}><span>초대 링크 사용</span><Toggle checked={inviteLinkEnabled} onChange={() => setInviteLinkEnabled((value) => !value)} label="초대 링크 사용" /></div><label><span>링크 만료</span><select value={linkExpiry} onChange={(event) => setLinkExpiry(event.target.value)} disabled={!inviteLinkEnabled}><option>1일</option><option>7일</option><option>30일</option><option>만료 없음</option></select></label></div></Modal>

      <Modal open={isArchiveOpen} onClose={() => setIsArchiveOpen(false)} title="워크스페이스 보관" closeOnBackdrop={false} footer={<><ModalSecondaryButton onClick={() => setIsArchiveOpen(false)}>취소</ModalSecondaryButton><ModalPrimaryButton onClick={() => { setIsArchiveOpen(false); showToast('워크스페이스를 읽기 전용으로 보관했습니다.', 'success'); }}><Archive size={15} /> 보관하기</ModalPrimaryButton></>}><div className={styles.confirmBody}><Archive size={34} /><h3>워크스페이스를 보관할까요?</h3><p>멤버는 기존 데이터를 열람할 수 있지만 문서 추가와 설정 변경은 제한됩니다.</p></div></Modal>

      <Modal open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="워크스페이스 삭제" closeOnBackdrop={false} footer={<><ModalSecondaryButton onClick={() => setIsDeleteOpen(false)}>취소</ModalSecondaryButton><ModalDangerButton disabled={deleteConfirmation !== workspaceName} onClick={() => { setIsDeleteOpen(false); showToast('목업 환경에서는 삭제 동작만 확인할 수 있습니다.', 'success'); }}><Trash2 size={15} /> 삭제하기</ModalDangerButton></>}><div className={styles.deleteConfirm}><span className={styles.warningIcon}><AlertTriangle size={32} /></span><h3>워크스페이스를 삭제하면 모든 멤버, 문서, 템플릿, 온보딩 기록이 영구적으로 삭제됩니다.</h3><strong>이 작업은 되돌릴 수 없습니다.</strong><label>삭제 확인 문구 입력<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="워크스페이스 이름을 입력하세요" /></label><p>정확히 <b>‘{workspaceName}’</b>를 입력해야 삭제할 수 있습니다.</p></div></Modal>
    </div>
  );
}
