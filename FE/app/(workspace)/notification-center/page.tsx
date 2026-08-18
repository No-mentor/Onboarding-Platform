'use client';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

export default function NotificationCenterPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // API 호출: getNotifications()
        setNotifications([]);
      } catch (err) {
        showToast('알림을 불러올 수 없습니다', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: '40px' }}>
      <h1>알림 센터</h1>
      {isLoading ? <p>로딩 중...</p> : notifications.length > 0 ? <pre>{JSON.stringify(notifications, null, 2)}</pre> : <p>알림이 없습니다</p>}
    </div>
  );
}