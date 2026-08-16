'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { getUserName, getUserEmail } from '@/lib/storage';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setUserName] = useState<string>('사용자');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const name = getUserName();
    const email = getUserEmail();
    if (name) setUserName(name);
    if (email) setUserEmail(email);
  }, []);

  return (
    <>
      <Sidebar userName={userName} userEmail={userEmail} />
      <TopHeader userName={`${userName}님`} />
      <main>{children}</main>
    </>
  );
}
