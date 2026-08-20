'use client';

import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck, RefreshCw, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';
import { useNotifications } from '@/components/dashboard/panels/notifications-panel';

export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const { notifications, isLoading, error, reload } = useNotifications();
  // 서버에 읽음 상태를 저장하는 API 가 없어 이 화면에서만 읽음 처리를 기억한다
  const [readIds, setReadIds] = useState<string[]>([]);

  const items = useMemo(
    () => notifications.map(item => ({ ...item, unread: item.unread && !readIds.includes(item.id) })),
    [notifications, readIds]
  );

  const filtered = activeTab === 'all' ? items : items.filter(item => item.unread);
  const unreadCount = items.filter(item => item.unread).length;

  const markAllAsRead = () => setReadIds(items.map(item => item.id));

  const iconFor = (item: (typeof items)[number]) => {
    if (item.unread) return <AlertCircle size={18} color="#F59E0B" />;
    if (item.title.includes('실패')) return <AlertCircle size={18} color="#EF4444" />;
    if (item.title.includes('완료')) return <CheckCircle size={18} color="#10B981" />;
    return <Info size={18} color="#6366F1" />;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      <CommonSidebar />

      <main style={{ flex: 1, padding: '32px 40px', maxWidth: '1000px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>알림 센터</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
              기한이 지난 할 일, 진행 병목, 문서 처리 결과를 모아서 보여 줍니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={markAllAsRead}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <CheckCheck size={16} /> 모두 읽음 처리
            </button>
            <button
              onClick={() => void reload()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} /> 새로 고침
            </button>
          </div>
        </header>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '20px',
              border: 'none',
              backgroundColor: activeTab === 'all' ? '#4F46E5' : '#E5E7EB',
              color: activeTab === 'all' ? '#FFFFFF' : '#4B5563',
              cursor: 'pointer',
            }}
          >
            전체 ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '20px',
              border: 'none',
              backgroundColor: activeTab === 'unread' ? '#4F46E5' : '#E5E7EB',
              color: activeTab === 'unread' ? '#FFFFFF' : '#4B5563',
              cursor: 'pointer',
            }}
          >
            확인 필요 ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isLoading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>불러오는 중...</div>
          ) : error ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#EF4444' }}>
              {error}
              <div style={{ marginTop: '12px' }}>
                <button onClick={() => void reload()} style={{ padding: '8px 14px', cursor: 'pointer' }}>
                  다시 시도
                </button>
              </div>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px 20px',
                  backgroundColor: item.unread ? '#EEF2FF' : '#FFFFFF',
                  border: `1px solid ${item.unread ? '#C7D2FE' : '#E5E7EB'}`,
                  borderRadius: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ paddingTop: '2px' }}>{iconFor(item)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                      {item.title}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {item.at ? new Date(item.at).toLocaleString('ko-KR') : ''}
                    </span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: '#4B5563', margin: 0, lineHeight: 1.5 }}>
                    {item.message}
                  </p>
                </div>
              </div>
            ))
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px dashed #D1D5DB',
                borderRadius: '12px',
                color: '#9CA3AF',
              }}
            >
              <Bell size={36} style={{ margin: '0 auto 12px', color: '#D1D5DB' }} />
              <p style={{ fontSize: '14px', margin: 0 }}>새로운 알림이 없습니다.</p>
            </div>
          )}
        </div>

        <p style={{ marginTop: '20px', fontSize: '12.5px', color: '#9CA3AF', lineHeight: 1.7 }}>
          서버에 알림 저장 API가 없어, 진행 현황과 문서 목록에서 알림을 만들어 보여 줍니다.
          읽음 처리는 이 화면을 열어 둔 동안만 유지됩니다.
        </p>
      </main>
    </div>
  );
}
