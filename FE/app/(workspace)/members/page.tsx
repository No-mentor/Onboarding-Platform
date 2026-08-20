'use client';

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Mail, Bell, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useMe } from '@/components/require-workspace';
import { useNotifications } from '@/components/dashboard/panels/notifications-panel';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  getMembers,
  getInvitations,
  inviteMember,
  resendInvitation,
  revokeInvitation,
  updateMember,
  type InvitationListItem,
  type MemberResponse,
  type MembershipStatus,
  type WorkspaceRole,
} from '@/lib/api';
import styles from './members.module.css';

const AVATAR_COLORS = ['#0765FC', '#8A7047', '#3F765D', '#2563EB', '#EC4899', '#7C3AED'];

/** 서버가 한 번에 주는 최대치. 역할별 인원수를 전체 기준으로 세기 위해 크게 받아 온다 */
const MEMBER_FETCH_SIZE = 100;

/** 초대·변경에서 고를 수 있는 역할. OWNER 는 서버가 변경을 막는다 */
const ROLE_OPTIONS: WorkspaceRole[] = ['NEW_HIRE', 'MEMBER', 'MANAGER', 'ADMIN'];
const STATUS_OPTIONS: MembershipStatus[] = ['ACTIVE', 'DISABLED'];

const ROLE_COLORS: Record<string, string> = {
  NEW_HIRE: '#0765FC',
  OWNER: '#0765FC',
  ADMIN: '#0765FC',
  MANAGER: '#80683D',
  MEMBER: '#287456',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#287456',
  DISABLED: '#985050',
};

export default function MembersPage() {
  const router = useRouter();
  const me = useMe();
  const { showToast } = useToast();
  const { unreadCount } = useNotifications();

  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // 수락 전 초대는 멤버 목록에 나타나지 않아 따로 조회한다
  const [invitations, setInvitations] = useState<InvitationListItem[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  /** 재발송·취소 중인 초대 id. 그 줄의 버튼만 잠근다 */
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);

  const [activeRole, setActiveRole] = useState<'all' | WorkspaceRole>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMemberDetailsModalOpen, setIsMemberDetailsModalOpen] = useState(false);
  const [isRoleAssignmentModalOpen, setIsRoleAssignmentModalOpen] = useState(false);
  const [isMemberRolesModalOpen, setIsMemberRolesModalOpen] = useState(false);
  const [isMemberActionsModalOpen, setIsMemberActionsModalOpen] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('NEW_HIRE');
  const [inviteDepartment, setInviteDepartment] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<WorkspaceRole>('MEMBER');
  const [newMemberStatus, setNewMemberStatus] = useState<MembershipStatus>('ACTIVE');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 역할 탭의 인원수를 정확히 세기 위해 한 번에 넉넉히 받아 온다
      const response = await getMembers(0, MEMBER_FETCH_SIZE);
      setMembers(response.items ?? []);
      setTotalMembers(response.totalElements ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '구성원 목록을 불러오지 못했습니다.');
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    setIsLoadingInvitations(true);
    setInvitationError(null);
    try {
      // 수락된 초대는 멤버 목록에 이미 나오므로 화면에서 걸러 낸다
      const response = await getInvitations(0, MEMBER_FETCH_SIZE);
      setInvitations((response.items ?? []).filter(item => item.status !== 'ACCEPTED'));
    } catch (err) {
      setInvitationError(err instanceof Error ? err.message : '초대 목록을 불러오지 못했습니다.');
      setInvitations([]);
    } finally {
      setIsLoadingInvitations(false);
    }
  }, []);

  useEffect(() => {
    // 진입 시 1회 조회 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    void loadInvitations();
  }, [load, loadInvitations]);

  const selectedMember = useMemo(
    () => members.find(m => m.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  );

  const counts = useMemo(
    () => ({
      NEW_HIRE: members.filter(m => m.role === 'NEW_HIRE').length,
      MEMBER: members.filter(m => m.role === 'MEMBER').length,
      MANAGER: members.filter(m => m.role === 'MANAGER').length,
      ADMIN: members.filter(m => m.role === 'ADMIN' || m.role === 'OWNER').length,
    }),
    [members]
  );

  const filteredMembers = useMemo(() => {
    if (activeRole === 'all') return members;
    // 관리자 탭에는 OWNER 도 함께 보여 준다
    if (activeRole === 'ADMIN') return members.filter(m => m.role === 'ADMIN' || m.role === 'OWNER');
    return members.filter(m => m.role === activeRole);
  }, [members, activeRole]);

  const avatarColor = (memberId: string) => {
    const index = members.findIndex(m => m.id === memberId);
    return AVATAR_COLORS[(index < 0 ? 0 : index) % AVATAR_COLORS.length];
  };

  const openMemberModal = (member: MemberResponse, modal: 'details' | 'role') => {
    setSelectedMemberId(member.id);
    setNewMemberRole(member.role);
    setNewMemberStatus(member.status);
    if (modal === 'details') setIsMemberDetailsModalOpen(true);
    else setIsRoleAssignmentModalOpen(true);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      showToast('초대할 이메일을 입력해 주세요.', 'error');
      return;
    }

    try {
      setIsInviting(true);
      await inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole,
        department: inviteDepartment.trim() || undefined,
      });
      showToast(`${inviteEmail}님에게 ${getDisplayLabel(inviteRole)} 초대 메일을 발송했습니다.`, 'success');
      setInviteEmail('');
      setInviteDepartment('');
      setIsInviteModalOpen(false);
      await Promise.all([load(), loadInvitations()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '초대 발송에 실패했습니다.', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  /** 보낸 초대를 다시 발송한다. 토큰은 유지되고 기한만 7일 뒤로 늘어난다 */
  const handleResendInvitation = async (invitation: InvitationListItem) => {
    try {
      setBusyInvitationId(invitation.invitationId);
      await resendInvitation(invitation.invitationId);
      showToast(`${invitation.email}로 초대 메일을 다시 보냈습니다.`, 'success');
      await loadInvitations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '초대 재발송에 실패했습니다.', 'error');
    } finally {
      setBusyInvitationId(null);
    }
  };

  /** 초대를 취소한다. 취소하면 같은 주소로 다시 초대할 수 있다 */
  const handleRevokeInvitation = async (invitation: InvitationListItem) => {
    try {
      setBusyInvitationId(invitation.invitationId);
      await revokeInvitation(invitation.invitationId);
      showToast(`${invitation.email}로 보낸 초대를 취소했습니다.`, 'success');
      await loadInvitations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '초대 취소에 실패했습니다.', 'error');
    } finally {
      setBusyInvitationId(null);
    }
  };

  /** 서버에 재발송 API 는 없지만, 같은 주소로 초대를 다시 만들면 메일이 다시 나간다 */
  const handleResendInvite = async (member: MemberResponse) => {
    try {
      setIsInviting(true);
      await inviteMember({
        email: member.email,
        role: member.role,
        department: member.department ?? undefined,
        careerLevel: member.careerLevel ?? undefined,
        title: member.title ?? undefined,
      });
      showToast(`${member.email}로 초대 메일을 다시 보냈습니다.`, 'success');
      setIsMemberActionsModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '초대 재발송에 실패했습니다.', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  /** 내보내기 대신 계정 상태를 바꾼다 (서버에 멤버 삭제 API 가 없다) */
  const handleToggleStatus = async (member: MemberResponse) => {
    const nextStatus: MembershipStatus = member.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      setIsUpdatingRole(true);
      await updateMember(member.id, { status: nextStatus });
      showToast(
        `${member.name}님의 계정을 ${getDisplayLabel(nextStatus)} 상태로 바꿨습니다.`,
        'success'
      );
      setIsMemberActionsModalOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '상태 변경에 실패했습니다.', 'error');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;

    try {
      setIsUpdatingRole(true);
      await updateMember(selectedMember.id, { role: newMemberRole, status: newMemberStatus });
      showToast(`${selectedMember.name}님의 정보를 변경했습니다.`, 'success');
      setIsRoleAssignmentModalOpen(false);
      setIsMemberDetailsModalOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '역할 변경에 실패했습니다.', 'error');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className={styles.layout}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>구성원 및 초대</h1>
            <p className={styles.subtitle}>워크스페이스 멤버를 초대하고 역할·상태를 관리하세요.</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.addMemberBtn} onClick={() => setIsInviteModalOpen(true)}>
              + 멤버 초대
            </button>
            <button
              className={styles.workspaceBtn}
              onClick={() => router.push('/workspace-selection')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{me?.currentWorkspace?.name ?? '업무 공간'}</span>
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')} title="알림 센터">
              <Bell size={20} />
              {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </button>
            <button className={styles.helpBtn} onClick={() => setIsMemberRolesModalOpen(true)} title="역할 권한 안내">
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {/* Onboarding Card */}
          <div className={styles.onboardingCard}>
            <div className={styles.cardLeft}>
              <Mail size={32} color="#0765FC" />
              <div>
                <div className={styles.cardTitle}>초대 보내기</div>
                <p className={styles.cardDesc}>새 멤버를 초대하고 직접 역할을 부여하세요.</p>
              </div>
            </div>
            <div className={styles.cardRight}>
              <input
                type="email"
                placeholder="example@company.com"
                className={styles.emailInput}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSendInvite(); }}
              />
              <select
                className={styles.roleSelect}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
              >
                {ROLE_OPTIONS.map(role => (
                  <option key={role} value={role}>{getDisplayLabel(role)}</option>
                ))}
              </select>
              <button className={styles.sendBtn} onClick={() => void handleSendInvite()} disabled={isInviting}>
                {isInviting ? '발송 중...' : '초대 발송'}
              </button>
            </div>
          </div>

          {/* 대기 중인 초대 — 수락 전이라 멤버 목록에는 아직 없는 사람들 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                보낸 초대 {invitations.length > 0 && `(${invitations.length})`}
              </h2>
              <button
                className={styles.roleTab}
                onClick={() => void loadInvitations()}
                disabled={isLoadingInvitations}
              >
                {isLoadingInvitations ? '불러오는 중...' : '새로고침'}
              </button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>이메일</th>
                    <th>역할</th>
                    <th>부서</th>
                    <th>초대한 사람</th>
                    <th>상태</th>
                    <th>기한</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingInvitations ? (
                    <tr><td colSpan={7} className={styles.dateCell}>불러오는 중...</td></tr>
                  ) : invitationError ? (
                    <tr>
                      <td colSpan={7} className={styles.dateCell}>
                        {invitationError}{' '}
                        <button onClick={() => void loadInvitations()}>다시 시도</button>
                      </td>
                    </tr>
                  ) : invitations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.dateCell}>
                        수락을 기다리는 초대가 없습니다. 위에서 새 멤버를 초대해 보세요.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((invitation) => {
                      const isBusy = busyInvitationId === invitation.invitationId;
                      // 기한이 지난 PENDING 은 서버가 expired=true 로 알려 준다
                      const statusLabel = invitation.expired
                        ? '만료됨'
                        : getDisplayLabel(invitation.status);
                      const statusColor = invitation.expired || invitation.status !== 'PENDING'
                        ? '#985050'
                        : '#80683D';

                      return (
                        <tr key={invitation.invitationId}>
                          <td>{invitation.email}</td>
                          <td>
                            <span
                              className={styles.roleBadge}
                              style={{ color: ROLE_COLORS[invitation.role] ?? '#0765FC' }}
                            >
                              {getDisplayLabel(invitation.role)}
                            </span>
                          </td>
                          <td>{invitation.department ?? '-'}</td>
                          <td>{invitation.inviterName ?? '-'}</td>
                          <td>
                            <span className={styles.statusBadge} style={{ color: statusColor }}>
                              <span className={styles.statusDot} style={{ backgroundColor: statusColor }} />
                              {statusLabel}
                            </span>
                          </td>
                          <td className={styles.dateCell}>
                            {new Date(invitation.expiresAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className={styles.invitationBtn}
                                onClick={() => void handleResendInvitation(invitation)}
                                disabled={isBusy}
                              >
                                {isBusy ? '처리 중...' : '재발송'}
                              </button>
                              {invitation.status === 'PENDING' && (
                                <button
                                  className={styles.cancelBtn}
                                  onClick={() => void handleRevokeInvitation(invitation)}
                                  disabled={isBusy}
                                >
                                  취소
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Members Table */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>멤버 목록</h2>
              <div className={styles.roleTabs}>
                <button
                  className={`${styles.roleTab} ${activeRole === 'all' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('all')}
                >
                  전체 ({members.length})
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'NEW_HIRE' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('NEW_HIRE')}
                >
                  신입 ({counts.NEW_HIRE})
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'MEMBER' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('MEMBER')}
                >
                  구성원 ({counts.MEMBER})
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'MANAGER' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('MANAGER')}
                >
                  관리 담당자 ({counts.MANAGER})
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'ADMIN' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('ADMIN')}
                >
                  관리자 ({counts.ADMIN})
                </button>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>부서</th>
                    <th>역할</th>
                    <th>상태</th>
                    <th>직급</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} className={styles.dateCell}>불러오는 중...</td></tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className={styles.dateCell}>
                        {error}{' '}
                        <button onClick={() => void load()}>다시 시도</button>
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr><td colSpan={6} className={styles.dateCell}>해당 역할의 구성원이 없습니다.</td></tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        onClick={() => openMemberModal(member, 'details')}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className={styles.nameCell}>
                            <div className={styles.avatar} style={{ backgroundColor: avatarColor(member.id) }}>
                              {member.name.charAt(0)}
                            </div>
                            <div className={styles.nameInfo}>
                              <div className={styles.memberName}>{member.name}</div>
                              <div className={styles.memberTeamSmall}>{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{member.department ?? '-'}</td>
                        <td>
                          <span className={styles.roleBadge} style={{ color: ROLE_COLORS[member.role] ?? '#0765FC' }}>
                            {getDisplayLabel(member.role)}
                          </span>
                        </td>
                        <td>
                          <span className={styles.statusBadge} style={{ color: STATUS_COLORS[member.status] }}>
                            <span className={styles.statusDot} /> {getDisplayLabel(member.status)}
                          </span>
                        </td>
                        <td className={styles.dateCell}>{member.title ?? '-'}</td>
                        <td>
                          <button
                            className={styles.actionSelect}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMemberId(member.id);
                              setNewMemberRole(member.role);
                              setNewMemberStatus(member.status);
                              setIsMemberActionsModalOpen(true);
                            }}
                          >
                            작업 선택
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Button */}
          <div className={styles.footer}>
            {totalMembers > members.length && (
              <p className={styles.helpText}>
                전체 {totalMembers}명 중 {members.length}명을 불러왔습니다. 서버가 한 번에 최대{' '}
                {MEMBER_FETCH_SIZE}명까지 주므로 그 이상은 표시되지 않습니다.
              </p>
            )}
            <button className={styles.invitationBtn} onClick={() => setIsMemberRolesModalOpen(true)}>
              역할 권한 가이드 확인
            </button>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. 멤버 초대 */}
      {isInviteModalOpen && (
        <Modal
          open
          onClose={() => setIsInviteModalOpen(false)}
          title="멤버 초대하기"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsInviteModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton loading={isInviting} onClick={() => void handleSendInvite()}>
                초대 메일 발송
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>이메일 주소</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="example@company.com"
              className={styles.input}
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>부여할 역할</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
              className={styles.select}
            >
              {ROLE_OPTIONS.map(role => (
                <option key={role} value={role}>{getDisplayLabel(role)}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>부서 (선택)</label>
            <input
              type="text"
              value={inviteDepartment}
              onChange={(e) => setInviteDepartment(e.target.value)}
              placeholder="예: 마케팅팀"
              className={styles.input}
            />
          </div>

          <p className={styles.helpText}>
            선택한 역할로 새 멤버를 초대합니다. 입력한 이메일로 온보딩 링크가 발송됩니다.
          </p>
        </Modal>
      )}

      {/* 2. 구성원 상세 */}
      {isMemberDetailsModalOpen && selectedMember && (
        <Modal
          open
          onClose={() => setIsMemberDetailsModalOpen(false)}
          title="구성원 상세 정보"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsMemberDetailsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setIsMemberDetailsModalOpen(false);
                  setIsRoleAssignmentModalOpen(true);
                }}
              >
                역할 변경하기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.memberCard}>
            <div className={styles.memberAvatar} style={{ backgroundColor: avatarColor(selectedMember.id) }}>
              {selectedMember.name.charAt(0)}
            </div>
            <h3 className={styles.memberCardName}>{selectedMember.name}</h3>
            <p className={styles.memberCardTeam}>{selectedMember.department ?? '부서 정보 없음'}</p>
          </div>

          <div className={styles.detailsGroup}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>이메일</span>
              <span className={styles.detailValue}>{selectedMember.email}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>역할</span>
              <span className={styles.detailValue} style={{ color: ROLE_COLORS[selectedMember.role] ?? '#0765FC' }}>
                {getDisplayLabel(selectedMember.role)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>상태</span>
              <span className={styles.detailValue} style={{ color: STATUS_COLORS[selectedMember.status] }}>
                <span className={styles.statusDot} /> {getDisplayLabel(selectedMember.status)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>직급</span>
              <span className={styles.detailValue}>{selectedMember.title ?? '-'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>경력</span>
              <span className={styles.detailValue}>{selectedMember.careerLevel ?? '-'}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. 역할·상태 변경 */}
      {isRoleAssignmentModalOpen && selectedMember && (
        <Modal
          open
          onClose={() => setIsRoleAssignmentModalOpen(false)}
          title="역할 및 상태 변경"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsRoleAssignmentModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton loading={isUpdatingRole} onClick={() => void handleUpdateRole()}>
                변경 저장
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.memberCard}>
            <div className={styles.memberAvatar} style={{ backgroundColor: avatarColor(selectedMember.id) }}>
              {selectedMember.name.charAt(0)}
            </div>
            <h3 className={styles.memberCardName}>{selectedMember.name}</h3>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>새 역할</label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as WorkspaceRole)}
              className={styles.select}
              disabled={selectedMember.role === 'OWNER'}
            >
              {ROLE_OPTIONS.map(role => (
                <option key={role} value={role}>{getDisplayLabel(role)}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>계정 상태</label>
            <select
              value={newMemberStatus}
              onChange={(e) => setNewMemberStatus(e.target.value as MembershipStatus)}
              className={styles.select}
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{getDisplayLabel(status)}</option>
              ))}
            </select>
          </div>

          <p className={styles.helpText}>
            {selectedMember.role === 'OWNER'
              ? '소유자(OWNER) 역할은 서버에서 변경을 막고 있습니다.'
              : '역할 변경 시 해당 멤버의 기능 접근 권한이 즉시 갱신됩니다.'}
          </p>
        </Modal>
      )}

      {/* 4. 구성원 작업 목록 */}
      {isMemberActionsModalOpen && selectedMember && (
        <Modal
          open
          onClose={() => setIsMemberActionsModalOpen(false)}
          title="구성원 작업"
          subtitle={`${selectedMember.name} · ${selectedMember.email}`}
          footer={<ModalSecondaryButton onClick={() => setIsMemberActionsModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.actionsList}>
            <button
              className={styles.actionItem}
              onClick={() => { setIsMemberActionsModalOpen(false); setIsRoleAssignmentModalOpen(true); }}
            >
              역할 변경
            </button>
            <button
              className={styles.actionItem}
              onClick={() => { setIsMemberActionsModalOpen(false); setIsMemberDetailsModalOpen(true); }}
            >
              상세 정보 보기
            </button>
            <button
              className={styles.actionItem}
              disabled={isInviting}
              onClick={() => void handleResendInvite(selectedMember)}
            >
              초대 재발송
            </button>
            <button
              className={styles.actionItem}
              style={selectedMember.status === 'ACTIVE' ? { color: '#dc2626' } : undefined}
              disabled={isUpdatingRole || selectedMember.role === 'OWNER'}
              onClick={() => void handleToggleStatus(selectedMember)}
            >
              {selectedMember.status === 'ACTIVE' ? '계정 비활성화' : '계정 다시 활성화'}
            </button>
          </div>
          <p className={styles.helpText}>
            서버에 구성원 삭제 API가 없어, 내보내기는 계정 비활성화로 처리합니다.
          </p>
        </Modal>
      )}

      {/* 5. 역할 권한 안내 */}
      {isMemberRolesModalOpen && (
        <Modal
          open
          onClose={() => setIsMemberRolesModalOpen(false)}
          title="멤버 역할 및 권한 안내"
          footer={<ModalSecondaryButton onClick={() => setIsMemberRolesModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.roleInfo}>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>신입 구성원 (NEW_HIRE)</h4>
              <p className={styles.roleDesc}>30일 계획과 체크리스트를 수행하며 본인의 진행 상황을 기록합니다.</p>
            </div>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>구성원 (MEMBER)</h4>
              <p className={styles.roleDesc}>문서 탐색 및 AI 질문 등 워크스페이스의 일반 기능을 활용합니다.</p>
            </div>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>관리 담당자 (MANAGER)</h4>
              <p className={styles.roleDesc}>신입 진행 현황과 감사 로그를 확인하고 계획을 재생성할 수 있습니다.</p>
            </div>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>관리자 (ADMIN / OWNER)</h4>
              <p className={styles.roleDesc}>멤버 초대, 권한 변경, 템플릿 관리 등 워크스페이스 전반을 총괄합니다.</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
