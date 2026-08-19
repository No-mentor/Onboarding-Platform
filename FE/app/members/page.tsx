'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Mail, Bell, HelpCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getDisplayLabel } from '@/lib/display-labels';
import { getMembers, inviteMember, updateMemberRole, MemberResponse } from '@/lib/api';
import styles from './members.module.css';

const DEFAULT_MEMBERS = [
  { id: 'mock-1', name: '김세원', initials: '김', bgColor: '#0765FC', team: '마케팅팀', email: 'sewon.mock@example.com', role: 'NEW_HIRE', status: 'ACTIVE', joinDate: '2024.05.20 10:30' },
  { id: 'mock-2', name: '이민수', initials: '이', bgColor: '#8A7047', team: '마케팅팀', email: 'minsu.mock@example.com', role: 'MANAGER', status: 'ACTIVE', joinDate: '2024.05.10 09:15' },
  { id: 'mock-3', name: '박지은', initials: '박', bgColor: '#3F765D', team: '브랜드팀', email: 'jieun.mock@example.com', role: 'MEMBER', status: 'ACTIVE', joinDate: '2024.05.08 14:20' },
  { id: 'mock-4', name: '최서연', initials: '최', bgColor: '#2563EB', team: '인사팀', email: 'seoyeon.mock@example.com', role: 'ADMIN', status: 'ACTIVE', joinDate: '2024.05.01 11:05' },
  { id: 'mock-5', name: '정하늘', initials: '정', bgColor: '#EC4899', team: '마케팅팀', email: 'haneul.mock@example.com', role: 'NEW_HIRE', status: 'PENDING', joinDate: '2024.05.24 16:40' },
];

export default function MembersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeRole, setActiveRole] = useState('all');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [members, setMembers] = useState<any[]>(DEFAULT_MEMBERS);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMemberDetailsModalOpen, setIsMemberDetailsModalOpen] = useState(false);
  const [isRoleAssignmentModalOpen, setIsRoleAssignmentModalOpen] = useState(false);
  const [isMemberRolesModalOpen, setIsMemberRolesModalOpen] = useState(false);

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('NEW_HIRE');
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');
  const [newMemberStatus, setNewMemberStatus] = useState('ACTIVE');

  const fetchMembersList = async () => {
    try {
      setIsLoading(true);
      const res = await getMembers();
      if (res && res.members && res.members.length > 0) {
        const mapped = res.members.map((m: MemberResponse, idx: number) => {
          const name = m.name || m.email.split('@')[0];
          const colors = ['#0765FC', '#8A7047', '#3F765D', '#2563EB', '#EC4899', '#7C3AED'];
          return {
            id: m.id || `member-${idx + 1}`,
            name,
            initials: name.charAt(0),
            bgColor: colors[idx % colors.length],
            team: m.department || '온보딩팀',
            email: m.email,
            role: m.role || 'MEMBER',
            status: m.status || 'ACTIVE',
            joinDate: m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '2024.05.20',
          };
        });
        setMembers(mapped);
      }
    } catch (err) {
      console.log('실제 멤버 목록 조회 실패 (모의 데이터 유지):', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembersList();
  }, []);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      showToast('초대할 이메일을 입력해 주세요.', 'error');
      return;
    }

    try {
      setIsInviting(true);
      await inviteMember(inviteEmail.trim(), inviteRole);
      showToast(`${inviteEmail}님에게 ${getDisplayLabel(inviteRole)} 초대 메일을 발송했습니다.`, 'success');
      setInviteEmail('');
      setIsInviteModalOpen(false);
      await fetchMembersList();
    } catch (err: any) {
      showToast(err?.message || '초대 발송에 실패했습니다.', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;

    try {
      setIsUpdatingRole(true);
      if (!selectedMember.id.startsWith('mock-')) {
        await updateMemberRole(selectedMember.id, newMemberRole);
      }
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, role: newMemberRole, status: newMemberStatus } : m
        )
      );
      showToast(`${selectedMember.name}님의 역할을 ${getDisplayLabel(newMemberRole)}(으)로 변경했습니다.`, 'success');
      setIsRoleAssignmentModalOpen(false);
      setIsMemberDetailsModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || '역할 변경에 실패했습니다.', 'error');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const roleColors: Record<string, string> = {
    NEW_HIRE: '#0765FC',
    OWNER: '#0765FC',
    ADMIN: '#0765FC',
    MANAGER: '#80683D',
    MEMBER: '#287456',
  };

  const statusColors: Record<string, string> = {
    ACTIVE: '#287456',
    PENDING: '#80683D',
  };

  const filteredMembers = activeRole === 'all' ? members : members.filter((m) => m.role === activeRole);

  const newHireCount = members.filter((m) => m.role === 'NEW_HIRE').length;
  const memberCount = members.filter((m) => m.role === 'MEMBER').length;
  const managerCount = members.filter((m) => m.role === 'MANAGER').length;
  const adminCount = members.filter((m) => m.role === 'ADMIN' || m.role === 'OWNER').length;

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
              <span>마케팅팀 인수인계</span>
              <ChevronDown size={16} />
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')} title="알림 센터">
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')} title="AI 어시스턴트">
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendInvite(); }}
              />
              <select className={styles.roleSelect} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="NEW_HIRE">신입 구성원</option>
                <option value="MEMBER">구성원</option>
                <option value="MANAGER">관리 담당자</option>
                <option value="ADMIN">관리자</option>
              </select>
              <button className={styles.sendBtn} onClick={handleSendInvite} disabled={isInviting}>
                {isInviting ? '발송 중...' : '초대 발송'}
              </button>
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
                  신입 ({newHireCount})
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'MEMBER' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('MEMBER')}
                >
                  구성원 ({memberCount})
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'MANAGER' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('MANAGER')}
                >
                  관리 담당자 ({managerCount})
                </button>
                <button
                  className={`${styles.roleTab} ${activeRole === 'ADMIN' ? styles.roleTabActive : ''}`}
                  onClick={() => setActiveRole('ADMIN')}
                >
                  관리자 ({adminCount})
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
                        setNewMemberRole(member.role);
                        setNewMemberStatus(member.status);
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
                          style={{ color: roleColors[member.role] || '#0765FC' }}
                        >
                          {getDisplayLabel(member.role)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{ color: statusColors[member.status] }}
                        >
                          <span className={styles.statusDot} /> {getDisplayLabel(member.status)}
                        </span>
                      </td>
                      <td className={styles.dateCell}>{member.joinDate}</td>
                      <td>
                        <button
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#fff',
                            color: '#0765FC',
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMember(member);
                            setNewMemberRole(member.role);
                            setNewMemberStatus(member.status);
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
            <button className={styles.invitationBtn} onClick={() => setIsMemberRolesModalOpen(true)}>
              역할 권한 가이드 확인
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
          title="멤버 초대하기"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsInviteModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isInviting}
                onClick={handleSendInvite}
              >
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
              onChange={(e) => setInviteRole(e.target.value)}
              className={styles.select}
            >
              <option value="NEW_HIRE">신입 구성원</option>
              <option value="MEMBER">구성원</option>
              <option value="MANAGER">관리 담당자</option>
              <option value="ADMIN">관리자</option>
            </select>
          </div>

          <p className={styles.helpText}>선택한 역할로 새 멤버를 초대합니다. 입력한 이메일로 온보딩 링크가 발송됩니다.</p>
        </Modal>
      )}

      {/* 2. Member Details Modal */}
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
              <span className={styles.detailValue} style={{ color: roleColors[selectedMember.role] || '#0765FC' }}>
                {getDisplayLabel(selectedMember.role)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>상태</span>
              <span className={styles.detailValue} style={{ color: statusColors[selectedMember.status] }}>
                <span className={styles.statusDot} /> {getDisplayLabel(selectedMember.status)}
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
                loading={isUpdatingRole}
                onClick={handleUpdateRole}
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
              <option value="NEW_HIRE">신입 구성원</option>
              <option value="MEMBER">구성원</option>
              <option value="MANAGER">관리 담당자</option>
              <option value="ADMIN">관리자</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>계정 상태</label>
            <select
              value={newMemberStatus}
              onChange={(e) => setNewMemberStatus(e.target.value)}
              className={styles.select}
            >
              <option value="ACTIVE">활성</option>
              <option value="PENDING">대기 중</option>
            </select>
          </div>

          <p className={styles.helpText}>역할 변경 시 해당 멤버의 기능 접근 권한이 즉시 갱신됩니다.</p>
        </Modal>
      )}

      {/* 4. Member Roles Guide Modal */}
      {isMemberRolesModalOpen && (
        <Modal
          open
          onClose={() => setIsMemberRolesModalOpen(false)}
          title="멤버 역할 및 권한 안내"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsMemberRolesModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.roleInfo}>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>신입 구성원 (NEW_HIRE)</h4>
              <p className={styles.roleDesc}>온보딩 플랜 및 체크리스트를 수행하며 본인의 진행 상황을 기록합니다.</p>
            </div>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>구성원 (MEMBER)</h4>
              <p className={styles.roleDesc}>문서 탐색 및 AI 어시스턴트 등 워크스페이스의 일반 기능을 활용합니다.</p>
            </div>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>관리 담당자 (MANAGER)</h4>
              <p className={styles.roleDesc}>신입 구성원의 온보딩 진척도를 모니터링하고 피드백을 전달합니다.</p>
            </div>
            <div className={styles.roleItem}>
              <h4 className={styles.roleName}>관리자 (ADMIN / OWNER)</h4>
              <p className={styles.roleDesc}>멤버 초대, 권한 변경, 템플릿 관리 등 워크스페이스의 전반을 총괄합니다.</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}