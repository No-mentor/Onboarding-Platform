'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Folder, Zap, CheckSquare, Target, BarChart3, Users, Building, Lock, Settings } from 'lucide-react';
import { useMe } from '@/components/require-workspace';
import { useAuthUser } from '@/lib/use-auth-user';
import { getDisplayLabel } from '@/lib/display-labels';
import styles from './common-sidebar.module.css';

/** 관리자 메뉴를 볼 수 있는 역할 (서버가 /admin/* 를 이 역할에만 허용한다) */
const ADMIN_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER']);

export function CommonSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 가드 안에서는 이미 받아 둔 /auth/me 를 쓰고, 밖이라면 저장된 로그인 정보로 대체한다
  const me = useMe();
  const authUser = useAuthUser();

  const userName = me?.name ?? authUser?.name ?? '사용자';
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'U';
  const role = me?.currentWorkspace?.role ?? null;
  const department = me?.profile?.department ?? me?.currentWorkspace?.name ?? null;

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

  // 역할을 아직 모르는 동안에는 감춘다 (권한 없는 화면으로 들어가 403 을 보지 않도록)
  const showAdminItems = role !== null && ADMIN_ROLES.has(role);

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <Link href="/dashboard" className={styles.sidebarHeader} style={{ textDecoration: 'none' }}>
        <div className={styles.mainLogo}>
          <Image
            src="/logo-main.png"
            alt="MENTALK 메인 로고"
            width={2008}
            height={1337}
            className={styles.mainLogoImage}
            priority
          />
        </div>
        <Image
          src="/mentalk-logo.png"
          alt="MENTALK"
          width={1200}
          height={199}
          className={styles.mentalkLogo}
          priority
        />
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

        {showAdminItems && (
          <>
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
          </>
        )}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/settings" className={styles.userCard} style={{ textDecoration: 'none', cursor: 'pointer' }} title="계정 설정 바로가기">
          <div className={styles.userAvatar}>{userInitial}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userRole}>
              {[role ? getDisplayLabel(role) : null, department].filter(Boolean).join(' · ') || '소속 정보 없음'}
            </div>
          </div>
        </Link>
        <button className={styles.collapseBtn} onClick={() => setIsCollapsed((value) => !value)}>
          {isCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
        </button>
      </div>
    </aside>
  );
}
