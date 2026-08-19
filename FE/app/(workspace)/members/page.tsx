'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Mail, Bell, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import { getMembers, inviteMember, updateMemberRole, type MemberResponse } from '@/lib/api';
import styles from './members.module.css';

export default function MembersPage() {
  const router = useRouter();
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [activeRole, setActiveRole] = useState('all');
  const [selectedMember, setSelectedMember] = useState<MemberResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMemberDetailsModalOpen, setIsMemberDetailsModalOpen] = useState(false);
  const [isRoleAssignmentModalOpen, setIsRoleAssignmentModalOpen] = useState(false);
  const [isMemberRolesModalOpen, setIsMemberRolesModalOpen] = useState(false);
  const [isMemberActionsModalOpen, setIsMemberActionsModalOpen] = useState(false);

  // Form states for invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('NEW_HIRE');

  // Form states for role assignment
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');
  const [newMemberStatus, setNewMemberStatus] = useState('ACTIVE');
  const [members, setMembers] = useState<MemberResponse[]>([]);

  // Load members on mount
  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const response = await getMembers();
      setMembers(response.items ?? []);
    } catch (err) {
      console.error('멤버 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleDirectInvite = async () => {
    if (!inviteEmail.trim()) {
      showToast('초대할 이메일을 입력해주세요.', 'error');
      return;
    }
    try {
      setIsLoading(true);
      await inviteMember(inviteEmail.trim(), inviteRole as any);
      showToast('초대를 성공적으로 발송했습니다.', 'success');
      setInviteEmail('');
      await loadMembers();
    } catch (err: any) {
      showToast(err.message || '초대 발송 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const avatarColors = ['#6C46A2', '#F97316', '#10B981', '#3B82F6', '#EC4899'];
  const avatarColorOf = (name: string) => {
    const sum = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return avatarColors[sum % avatarColors.length];
  };

  const roleColors: { [key: string]: string } = {
    NEW_HIRE: '#6C46A2',
    OWNER: '#3B82F6',
    ADMIN: '#3B82F6',
    MANAGER: '#F97316',
    MEMBER: '#10B981',
  };

  const statusColors: { [key: string]: string } = {
    ACTIVE: '#10B981',
    PENDING: '#F97316',
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = members.filter((m) => {
    const roleMatch = activeRole === 'all' || m.role === activeRole;
    const queryMatch =
      !searchQuery.trim() ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return roleMatch && queryMatch;
  });

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
            <button className={styles.workspaceBtn} onClick={() => router.push('/workspace-selection')}>
              워크스페이스 전환
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')}>
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {/* Onboarding Card */}
          <div className={styles.onboardingCard}>
            <div className={styles.cardLeft}>
              <Mail size={32} color="#6C46A2" />
              <div>
                <div className={styles.cardTitle}>초대 보내기</div>
                <p className={styles.cardDesc}>새 멤버를 초대하고 적합한<br />역할을 부여하세요.</p>
              </div>
            </div>
            <div className={styles.cardRight}>
              <input
                type="email"
                placeholder="example@company.com"
                className={styles.emailInput}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <select className={styles.roleSelect} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="NEW_HIRE">NEW_HIRE</option>
                <option value="MEMBER">MEMBER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <button className={styles.sendBtn} onClick={handleDirectInvite}>초대 발송</button>
            </div>
          </div>

          {/* Members Table */}
          <div className={styles.card}>
            <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 className={styles.cardTitle} style={{ margin: 0 }}>멤버 목록 ({filteredMembers.length})</h2>
                <input
                  type="text"
                  placeholder="이름, 이메일 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
              </div>
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
                  신입 ({members.filter((m) => m.role === 'NEW_HIRE').length})
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'MEMBER' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('MEMBER')}
                >
                  멤버 ({members.filter((m) => m.role === 'MEMBER').length})
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'MANAGER' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('MANAGER')}
                >
                  매니저 ({members.filter((m) => m.role === 'MANAGER').length})
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'ADMIN' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('ADMIN')}
                >
                  관리자 ({members.filter((m) => m.role === 'ADMIN' || m.role === 'OWNER').length})
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
                    <th>직함</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => {
                        setSelectedMember(member);
                        setIsMemberDetailsModalOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className={styles.nameCell}>
                          <div
                            className={styles.avatar}
                            style={{ backgroundColor: avatarColorOf(member.name) }}
                          >
                            {member.name.trim().charAt(0)}
                          </div>
                          <div className={styles.nameInfo}>
                            <div className={styles.memberName}>{member.name}</div>
                            <div className={styles.memberTeamSmall}>{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{member.department ?? '-'}</td>
                      <td>
                        <span
                          className={styles.roleBadge}
                          style={{ color: roleColors[member.role] || '#6C46A2' }}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{ color: statusColors[member.status] }}
                        >
                          <span className={styles.statusDot} /> {member.status}
                        </span>
                      </td>
                      <td className={styles.dateCell}>{member.title ?? '-'}</td>
                      <td>
                        <button
                          className={styles.actionSelect}
                          style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#F9FAFB', fontSize: '13px' }}
                          onClick={() => {
                            setSelectedMember(member);
                            setNewMemberRole(member.role || 'MEMBER');
                            setIsRoleAssignmentModalOpen(true);
                          }}
                        >
                          역할 변경
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Button */}
          <div className={styles.footer}>
            <button className={styles.invitationBtn} onClick={() => setIsInviteModalOpen(true)}>
              + 새 멤버 초대하기
            </button>
          </div>
        </div>

      </main>

      {/* MODALS */}

      {/* 1. Invite Members Modal */}
      {isInviteModalOpen && (
        <Modal
          open
          onClose={() => setIsInviteModalOpen(false)}
          title="멤버 초대"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsInviteModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isLoading}
                onClick={async () => {
                  if (!inviteEmail.trim()) {
                    showToast('초대할 이메일을 입력해주세요.', 'error');
                    return;
                  }
                  try {
                    setIsLoading(true);
                    await inviteMember(inviteEmail.trim(), inviteRole as any);
                    showToast(`${inviteEmail} 님에게 초대를 발송했습니다!`, 'success');
                    setIsInviteModalOpen(false);
                    setInviteEmail('');
                    await loadMembers();
                  } catch (err: any) {
                    showToast(err.message || '초대 발송 실패', 'error');
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                초대 발송
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
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>역할</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className={styles.select}
            >
              <option value="NEW_HIRE">NEW_HIRE (신규 입사자)</option>
              <option value="MEMBER">MEMBER (일반 팀원)</option>
              <option value="MANAGER">MANAGER (온보딩 멘토/매니저)</option>
              <option value="ADMIN">ADMIN (워크스페이스 관리자)</option>
            </select>
          </div>

          <p className={styles.helpText}>선택한 역할로 새 멤버를 초대합니다. 초대 메일이 발송됩니다.</p>
        </Modal>
      )}

      {/* 2. Member Details Modal */}
      {isMemberDetailsModalOpen && selectedMember && (
        <Modal
          open
          onClose={() => setIsMemberDetailsModalOpen(false)}
          title="멤버 정보"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsMemberDetailsModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                onClick={() => {
                  setIsMemberDetailsModalOpen(false);
                  setNewMemberRole(selectedMember.role || 'MEMBER');
                  setIsRoleAssignmentModalOpen(true);
                }}
              >
                역할 변경하기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.memberCard}>
            <div
              className={styles.memberAvatar}
              style={{ backgroundColor: avatarColorOf(selectedMember.name) }}
            >
              {selectedMember.name.trim().charAt(0)}
            </div>
            <h3 className={styles.memberCardName}>{selectedMember.name}</h3>
            <p className={styles.memberCardTeam}>{selectedMember.department ?? '-'}</p>
          </div>

          <div className={styles.detailsGroup}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>이메일</span>
              <span className={styles.detailValue}>{selectedMember.email}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>역할</span>
              <span className={styles.detailValue} style={{ color: roleColors[selectedMember.role] || '#6C46A2' }}>
                {selectedMember.role}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>상태</span>
              <span className={styles.detailValue} style={{ color: statusColors[selectedMember.status] }}>
                <span className={styles.statusDot} /> {selectedMember.status}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>직함</span>
              <span className={styles.detailValue}>{selectedMember.title ?? '-'}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Role Assignment Modal */}
      {isRoleAssignmentModalOpen && selectedMember && (
        <Modal
          open
          onClose={() => setIsRoleAssignmentModalOpen(false)}
          title="역할 및 권한 변경"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsRoleAssignmentModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isLoading}
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    await updateMemberRole(selectedMember.id, newMemberRole as any);
                    showToast(`${selectedMember.name} 님의 역할을 ${newMemberRole}(으)로 변경했습니다.`, 'success');
                    setIsRoleAssignmentModalOpen(false);
                    await loadMembers();
                  } catch (err: any) {
                    showToast(err.message || '역할 변경 실패', 'error');
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                변경 저장
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.memberCard}>
            <div
              className={styles.memberAvatar}
              style={{ backgroundColor: avatarColorOf(selectedMember.name) }}
            >
              {selectedMember.name.trim().charAt(0)}
            </div>
            <h3 className={styles.memberCardName}>{selectedMember.name}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>{selectedMember.email}</p>
          </div>

          <div className={styles.formGroup} style={{ marginTop: '16px' }}>
            <label className={styles.label}>새 역할 선택</label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className={styles.select}
            >
              <option value="NEW_HIRE">NEW_HIRE (신규 입사자)</option>
              <option value="MEMBER">MEMBER (일반 팀원)</option>
              <option value="MANAGER">MANAGER (온보딩 매니저)</option>
              <option value="ADMIN">ADMIN (관리자)</option>
            </select>
          </div>

          <p className={styles.helpText}>역할 변경 시 워크스페이스 내 문서 열람 및 관리 권한이 즉시 갱신됩니다.</p>
        </Modal>
      )}

      {/* 4. Member Roles Modal */}
      {isMemberRolesModalOpen && (
        <Modal
          open
          onClose={() => setIsMemberRolesModalOpen(false)}
          title="멤버 역할 설명"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsMemberRolesModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.roleInfo}>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>NEW_HIRE</h4>
              <p className={styles.roleDesc}>새로 입사한 직원이며 기본 접근 권한을 가집니다.</p>
            </div>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>MEMBER</h4>
              <p className={styles.roleDesc}>일반 구성원으로 대부분의 기능에 접근할 수 있습니다.</p>
            </div>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>MANAGER</h4>
              <p className={styles.roleDesc}>팀 관리자로 팀원 관리 및 보고서 작성 권한이 있습니다.</p>
            </div>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>ADMIN</h4>
              <p className={styles.roleDesc}>최고 관리자로 모든 기능에 대한 완전한 접근 권한이 있습니다.</p>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Member Actions Modal */}
      {isMemberActionsModalOpen && selectedMember && (
        <Modal
          open
          onClose={() => setIsMemberActionsModalOpen(false)}
          title="멤버 작업"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsMemberActionsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.memberCard}>
            <div
              className={styles.memberAvatar}
              style={{ backgroundColor: avatarColorOf(selectedMember.name) }}
            >
              {selectedMember.name.trim().charAt(0)}
            </div>
            <h3 className={styles.memberCardName}>{selectedMember.name}</h3>
          </div>

          <div className={styles.actionsList}>
            <button className={styles.actionItem}>
              역할 변경
            </button>
            <button className={styles.actionItem}>
              초대 재발송
            </button>
            <button className={styles.actionItem}>
              이메일 변경
            </button>
            <button className={styles.actionItem} style={{ color: '#dc2626' }}>
              삭제
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
