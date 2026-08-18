'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Folder, Zap, CheckSquare, Target, BarChart3, Users, Users2, Building, Lock, Settings } from 'lucide-react';
import { getUserName, getUserEmail } from '@/lib/storage';
import styles from './common-sidebar.module.css';

export function CommonSidebar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>('사용자');
  const [userInitial, setUserInitial] = useState<string>('S');
  const [userTeam, setUserTeam] = useState<string>('팀');

  useEffect(() => {
    const name = getUserName();
    const email = getUserEmail();

    if (name) {
      setUserName(name);
      setUserInitial(name.charAt(0).toUpperCase());
    }

    if (email) {
      const domain = email.split('@')[1];
      if (domain === 'marketing.company.com') {
        setUserTeam('마케팅팀');
      } else if (domain === 'dev.company.com') {
        setUserTeam('개발팀');
      } else if (domain === 'design.company.com') {
        setUserTeam('디자인팀');
      }
    }
  }, []);

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
    { href: '#', label: '워크스페이스', icon: Settings },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>M</div>
        <div>
          <div className={styles.brandName}>MENTALK</div>
          <div className={styles.brandSub}>Mentor + Talk</div>
        </div>
      </div>

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
        <div className={styles.userCard}>
          <div className={styles.userAvatar}>{userInitial}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userRole}>NEW_HIRE · {userTeam}</div>
          </div>
        </div>
        <button className={styles.collapseBtn}>메뉴 접기</button>
      </div>
    </aside>
  );
}
