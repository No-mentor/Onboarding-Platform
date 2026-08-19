'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Folder, Zap, CheckSquare, Target, BarChart3, Users, Building, Lock, Settings } from 'lucide-react';
import { useMe } from './require-workspace';
import type { WorkspaceRole } from '@/lib/auth';
import styles from './common-sidebar.module.css';

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: '관리자',
  ADMIN: '관리자',
  MANAGER: '매니저',
  MEMBER: '멤버',
  NEW_HIRE: '신입',
};

export function CommonSidebar() {
  const pathname = usePathname();
  const me = useMe();

  const userName = me?.name ?? '사용자';
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'U';
  const workspace = me?.currentWorkspace;
  const roleLabel = workspace ? ROLE_LABEL[workspace.role] ?? workspace.role : null;
  // 부서 정보가 있으면 함께 보여준다
  const department = me?.profile?.department;

  const navItems = [
    { href: '/dashboard', label: '홈', icon: Home },
    { href: '/file-management', label: '파일 탐색', icon: Folder },
    { href: '/ai-chat', label: 'AI 질문', icon: Zap },
    { href: '/daily-tasks', label: '오늘 할 일', icon: CheckSquare },
    { href: '/30day-plan', label: '30일 계획', icon: Target },
    { href: '/checklist', label: '체크리스트', icon: CheckSquare },
  ];

  const adminItems = [
    { href: '/members', label: '구성원', icon: Users },
    { href: '/templates', label: '템플릿', icon: BarChart3 },
    { href: '/onboarding-progress', label: '진행 현황', icon: Building },
    { href: '/audit-log', label: '감사 로그', icon: Lock },
    { href: '/workspace-settings', label: '워크스페이스', icon: Settings },
  ];

  return (
    <aside className={styles.sidebar}>
      <Link href="/dashboard" className={styles.sidebarHeader} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className={styles.logo}>{workspace ? workspace.name.trim().charAt(0) : 'O'}</div>
        <div>
          <div className={styles.brandName}>{workspace?.name ?? 'OnboardOS'}</div>
          <div className={styles.brandSub}>
            {workspace ? `onboardos.com/${workspace.slug}` : '업무 공간 없음'}
          </div>
        </div>
      </Link>

      <nav className={styles.navMenu}>
        <div className={styles.navSection}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <IconComponent className={styles.iconComponent} />
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className={styles.divider} />

        <div className={styles.navSection}>
          {adminItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <IconComponent className={styles.iconComponent} />
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/settings" className={styles.userCard} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className={styles.userAvatar}>{userInitial}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userRole}>
              {[roleLabel, department].filter(Boolean).join(' · ') || '내 설정 관리 →'}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
