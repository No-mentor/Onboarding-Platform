'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Mail, Bell, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import { getMembers } from '@/lib/api';
import styles from './members.module.css';

export default function MembersPage() {
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [activeRole, setActiveRole] = useState('all');
  const [selectedMember, setSelectedMember] = useState<any>(null);
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
  const [members, setMembers] = useState<any[]>([]);

  // Load members on mount
  useEffect(() => {
    const loadMembers = async () => {
      try {
        setIsLoading(true);
        const response = await getMembers();
        setMembers(response.content || []);
      } catch (err) {
        console.error('멤버 로드 실패:', err);
        showToast('멤버 목록을 불러올 수 없습니다', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadMembers();
  }, []);

  const mockMembers = [
    {
      id: 1,
      name: '김세원',
      initials: '김',
      bgColor: '#6C46A2',
      team: '마케팅팀',
      email: 'example@company.com',
      role: 'NEW_HIRE',
      status: 'ACTIVE',
      joinDate: '2024.05.20 10:30',
    },
    {
      id: 2,
      name: '이민수',
      initials: '이',
      bgColor: '#F97316',
      team: '마케팅팀',
      email: 'example@company.com',
      role: 'MANAGER',
      status: 'ACTIVE',
      joinDate: '2024.05.10 09:15',
    },
    {
      id: 3,
      name: '박지은',
      initials: '박',
      bgColor: '#10B981',
      team: '브랜드팀',
      email: 'example@company.com',
      role: 'MEMBER',
      status: 'ACTIVE',
      joinDate: '2024.05.08 14:20',
    },
    {
      id: 4,
      name: '최서연',
      initials: '최',
      bgColor: '#3B82F6',
      team: 'People',
      email: 'example@company.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      joinDate: '2024.05.01 11:05',
    },
    {
      id: 5,
      name: '정하늘',
      initials: '정',
      bgColor: '#EC4899',
      team: '마케팅팀',
      email: 'example@company.com',
      role: 'NEW_HIRE',
      status: 'PENDING',
      joinDate: '2024.05.24 16:40',
    },
  ];

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

  const filteredMembers = activeRole === 'all' ? members : members.filter((m) => m.role === activeRole);

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
            <button className={styles.addMemberBtn}>
              + 멤버 초대
            </button>
            <button className={styles.workspaceBtn}>
              마케팅팀 인수인계
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn}>
              <Bell size={20} />
              <span className={styles.badge}>7</span>
            </button>
            <button className={styles.helpBtn}>
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
                <p className={styles.cardDesc}>새 멤버를 초대하고 직접한<br />역할을 부여하세요.</p>
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
                <option>NEW_HIRE</option>
                <option>MEMBER</option>
                <option>MANAGER</option>
                <option>ADMIN</option>
              </select>
              <button className={styles.sendBtn} onClick={() => setIsInviteModalOpen(true)}>초대 발송</button>
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
                  전체
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'OWNER' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('OWNER')}
                >
                  OWNER
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'ADMIN' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('ADMIN')}
                >
                  ADMIN
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'MANAGER' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('MANAGER')}
                >
                  MANAGER
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'MEMBER' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('MEMBER')}
                >
                  MEMBER
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'NEW_HIRE' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('NEW_HIRE')}
                >
                  NEW_HIRE
                </button>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>팀</th>
                    <th>역할</th>
                    <th>상태</th>
                    <th>초대일</th>
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
                            style={{ backgroundColor: member.bgColor }}
                          >
                            {member.initials}
                          </div>
                          <div className={styles.nameInfo}>
                            <div className={styles.memberName}>{member.name}</div>
                            <div className={styles.memberTeamSmall}>{member.team}</div>
                          </div>
                        </div>
                      </td>
                      <td>{member.team}</td>
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
                      <td className={styles.dateCell}>{member.joinDate}</td>
                      <td>
                        <select
                          className={styles.actionSelect}
                          onClick={() => {
                            setSelectedMember(member);
                            setIsRoleAssignmentModalOpen(true);
                          }}
                        >
                          <option>역할 / 상태 변경</option>
                          <option>Member</option>
                          <option>Manager</option>
                          <option>Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Button */}
          <div className={styles.footer}>
            <button className={styles.invitationBtn}>
              Invitation + Roles
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
                loading={isPending('members-0')}
                onClick={() => run('members-0', '초대를 발송했습니다.', () => setIsInviteModalOpen(false))}
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
              <option value="NEW_HIRE">NEW_HIRE</option>
              <option value="MEMBER">MEMBER</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
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
                loading={isPending('members-1')}
                onClick={() => run('members-1', '역할을 변경했습니다.', () => setIsMemberDetailsModalOpen(false))}
              >
                역할 변경
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.memberCard}>
            <div
              className={styles.memberAvatar}
              style={{ backgroundColor: selectedMember.bgColor }}
            >
              {selectedMember.initials}
            </div>
            <h3 className={styles.memberCardName}>{selectedMember.name}</h3>
            <p className={styles.memberCardTeam}>{selectedMember.team}</p>
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
              <span className={styles.detailLabel}>초대일</span>
              <span className={styles.detailValue}>{selectedMember.joinDate}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Role Assignment Modal */}
      {isRoleAssignmentModalOpen && selectedMember && (
        <Modal
          open
          onClose={() => setIsRoleAssignmentModalOpen(false)}
          title="역할 및 상태 변경"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsRoleAssignmentModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('members-2')}
                onClick={() => run('members-2', '변경 내용을 저장했습니다.', () => setIsRoleAssignmentModalOpen(false))}
              >
                변경 저장
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.memberCard}>
            <div
              className={styles.memberAvatar}
              style={{ backgroundColor: selectedMember.bgColor }}
            >
              {selectedMember.initials}
            </div>
            <h3 className={styles.memberCardName}>{selectedMember.name}</h3>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>새 역할</label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className={styles.select}
            >
              <option value="NEW_HIRE">NEW_HIRE</option>
              <option value="MEMBER">MEMBER</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>상태</label>
            <select
              value={newMemberStatus}
              onChange={(e) => setNewMemberStatus(e.target.value)}
              className={styles.select}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>

          <p className={styles.helpText}>변경 사항은 즉시 적용됩니다.</p>
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
              style={{ backgroundColor: selectedMember.bgColor }}
            >
              {selectedMember.initials}
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
