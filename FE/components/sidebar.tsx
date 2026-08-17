'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, User, Folder, Zap, CheckSquare, Users, MessageCircle, FileText, Users2, Settings } from 'lucide-react';
import styles from './sidebar.module.css';

const navItems = [
  { id: 'home', label: '홈', icon: Home, href: '/' },
  { id: 'roles', label: '내 업무 공간', icon: User, href: '#' },
  { id: 'tasks', label: '파일 탐색', icon: Folder, href: '#' },
  { id: 'ai', label: 'AI 가이드', icon: Zap, href: '#' },
  { id: 'today', label: '오늘 할 일', icon: CheckSquare, href: '#' },
  { id: 'roadmap', label: '인수인계 로드맵', icon: Users, href: '#' },
  { id: 'chat', label: 'AI에게 질문', icon: MessageCircle, href: '#' },
];

const adminItems = [
  { id: 'docs', label: '문서 관리', icon: FileText, href: '#' },
  { id: 'team', label: '구성원', icon: Users2, href: '#' },
  { id: 'settings', label: '설정', icon: Settings, href: '#' },
];

interface SidebarProps {
  userName?: string;
  userEmail?: string;
}

export function Sidebar({ userName = '사용자', userEmail = 'user@company.com' }: SidebarProps) {
  const getInitial = (name: string) => {
    const parts = name.split(' ');
    return (parts[parts.length - 1]?.[0] || '?').toUpperCase();
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <Image
          src="/logo.png"
          alt="OnboardOS Logo"
          width={40}
          height={40}
          className={styles.logo}
        />
        <span className={styles.title}>OnboardOS</span>
      </div>

      <nav className={styles.nav}>
        <div className={styles.section}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link key={item.id} href={item.href} className={styles.navItem}>
                <IconComponent className={styles.icon} size={20} strokeWidth={1.5} />
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className={styles.divider} />

        <div className={styles.section}>
          {adminItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link key={item.id} href={item.href} className={styles.navItem}>
                <IconComponent className={styles.icon} size={20} strokeWidth={1.5} />
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className={styles.footer}>
        <div className={styles.user}>
          <div className={styles.avatar}>{getInitial(userName)}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userEmail}>{userEmail}</div>
          </div>
          <button className={styles.dropdown}>⋮</button>
        </div>
      </div>
    </aside>
  );
}
