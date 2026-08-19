'use client';

import React from 'react';
import Link from 'next/link';
import { Boxes, Info, Plus } from 'lucide-react';
import styles from './workspace-empty-state.module.css';

/**
 * 소속 워크스페이스가 하나도 없는 사용자에게 보여주는 화면.
 * 대시보드는 첫 진입 지점이라 다른 곳으로 튕겨내지 않고 여기서 다음 행동을 고르게 한다.
 */
export function WorkspaceEmptyState() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <Boxes size={26} strokeWidth={1.6} />
        </div>

        <h1 className={styles.title}>아직 참여 중인 업무 공간이 없어요</h1>
        <p className={styles.description}>
          업무 공간을 만들면 30일 인수인계 계획과 오늘 할 일이 자동으로 준비됩니다.
          이미 초대를 받으셨다면 초대 메일의 링크로 참여해 주세요.
        </p>

        <div className={styles.actions}>
          <Link href="/workspace-create" className={styles.primary}>
            <Plus size={17} strokeWidth={2.2} />
            새 업무 공간 만들기
          </Link>
          <Link href="/workspace-selection" className={styles.secondary}>
            참여 중인 업무 공간 찾기
          </Link>
        </div>

        <div className={styles.notice}>
          <Info size={15} strokeWidth={1.8} />
          <span>
            초대를 받았는데 목록에 보이지 않는다면, 초대받은 주소와 지금 로그인한 계정이
            같은지 확인해 주세요.
          </span>
        </div>
      </div>
    </div>
  );
}
