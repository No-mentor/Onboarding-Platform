'use client';

import React, { use, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { MemberInvitationAcceptContent } from '@/app/member-invitation-accept/page';

export default function InvitationDynamicAcceptPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const unwrappedParams = typeof (params as any)?.then === 'function' ? use(params as Promise<{ token: string }>) : (params as { token: string });
  const routeParams = useParams();
  const token = unwrappedParams?.token || (routeParams?.token as string) || '';

  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        초대 정보를 확인하는 중...
      </div>
    }>
      <MemberInvitationAcceptContent tokenProp={token} />
    </Suspense>
  );
}