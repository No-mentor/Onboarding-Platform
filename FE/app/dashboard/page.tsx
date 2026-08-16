'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken, getWorkspaceId, saveAuthToken, getUserId, getUserEmail, clearAuthToken } from '@/lib/storage';
import { getMyWorkspaces, createWorkspace } from '@/lib/workspace';
import { fetchDashboard } from '@/lib/dashboard';
import { HomeDashboard } from '@/components/home-dashboard';

interface DashboardData {
  progressPercent: number;
  today?: {
    done: number;
    total: number;
    items: Array<{ id: string; title: string; description: string; priority: string }>;
  };
  checklist?: {
    done: number;
    total: number;
  };
  plan?: any;
  message?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function initDashboard() {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/login');
          return;
        }

        let wsId = getWorkspaceId();

        // Workspace가 없으면 생성 또는 조회
        if (!wsId) {
          console.log('Getting or creating workspace...');
          const workspaces = await getMyWorkspaces(token);

          if (workspaces.length > 0) {
            wsId = workspaces[0].id;
            console.log('Using existing workspace:', wsId);
            saveAuthToken(token, getUserId()!, getUserEmail()!, wsId);
          } else {
            const userId = getUserId()!;
            const userSlug = userId.substring(0, 8);
            const newWorkspace = await createWorkspace(token, 'My Workspace', `my-workspace-${userSlug}`);
            wsId = newWorkspace.id;
            console.log('Created new workspace:', wsId);
            saveAuthToken(token, userId, getUserEmail()!, wsId);
          }
        }

        setWorkspaceId(wsId);

        // 대시보드 데이터 조회
        console.log('Fetching dashboard data for workspace:', wsId);
        const dashboardData = await fetchDashboard(wsId, token);
        console.log('Dashboard data:', dashboardData);
        setData(dashboardData);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load dashboard';
        console.error('Dashboard error:', errorMsg);

        // 401 Unauthorized인 경우 로그인 페이지로 이동
        if (errorMsg.includes('401')) {
          clearAuthToken();
          router.push('/login');
          return;
        }

        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    }

    initDashboard();
  }, [mounted, router]);

  if (!mounted) {
    return null;
  }

  return <HomeDashboard data={data || undefined} isLoading={isLoading} error={error} workspaceId={workspaceId} />;
}
