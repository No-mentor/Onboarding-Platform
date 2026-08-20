'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { getMyWorkspaces, type WorkspaceRole, type WorkspaceSummary } from '@/lib/api';
import { getWorkspaceId, saveWorkspaceId } from '@/lib/storage';
import styles from './workspace-selection.module.css';

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: '관리자',
  ADMIN: '관리자',
  MANAGER: '매니저',
  MEMBER: '멤버',
  NEW_HIRE: '신입',
};

export default function WorkspaceSelectionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const response = await getMyWorkspaces();
      setWorkspaces(response.items ?? []);
      setCurrentId(getWorkspaceId());
    } catch {
      setHasError(true);
      showToast('업무 공간을 불러오지 못했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // 진입 시 1회 목록을 불러온다 (결과 도착 후 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleSelect = (workspace: WorkspaceSummary) => {
    setSelectedId(workspace.id);
    saveWorkspaceId(workspace.id);
    router.push('/dashboard');
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Image src="/logo.png" alt="MenTalk Logo" width={28} height={28} />
          <span className={styles.brandName}>MenTalk</span>
        </div>

        <h1 className="title">업무 공간 선택</h1>
        <p className="subtitle">어느 업무 공간에서 시작할지 골라 주세요. 나중에 언제든 바꿀 수 있어요.</p>

        {isLoading ? (
          <div className={styles.list} aria-busy="true">
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </div>
        ) : hasError ? (
          <div className={styles.stateBox}>
            목록을 불러오지 못했습니다.
            <br />
            <button type="button" className={styles.retry} onClick={() => void load()}>
              다시 시도
            </button>
          </div>
        ) : workspaces.length === 0 ? (
          <div className={styles.stateBox}>
            참여 중인 업무 공간이 없습니다.
            <br />
            새로 만들거나, 초대 메일의 링크로 참여해 주세요.
          </div>
        ) : (
          <div className={styles.list}>
            {workspaces.map(workspace => (
              <button
                key={workspace.id}
                type="button"
                className={styles.item}
                onClick={() => handleSelect(workspace)}
                disabled={selectedId !== null}
              >
                <span className={styles.mark} aria-hidden="true">
                  {workspace.name.trim().charAt(0)}
                </span>
                <span className={styles.body}>
                  <span className={styles.name}>{workspace.name}</span>
                  <span className={styles.meta}>
                    <span className={styles.slug}>onboardos.com/{workspace.slug}</span>
                    <span className={styles.role}>{ROLE_LABEL[workspace.role] ?? workspace.role}</span>
                    {workspace.id === currentId && <span className={styles.role}>현재</span>}
                  </span>
                </span>
                <ChevronRight size={18} className={styles.chevron} />
              </button>
            ))}
          </div>
        )}

        <hr className={styles.divider} />

        <Link href="/workspace-create" className={styles.createLink}>
          <Plus size={16} strokeWidth={2.2} />
          새 업무 공간 만들기
        </Link>
      </div>
    </div>
  );
}
