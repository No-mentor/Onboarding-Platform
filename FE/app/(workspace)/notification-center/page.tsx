'use client';

import React, { useState } from 'react';
import { Bell, CheckCheck, Trash2, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { CommonSidebar } from '@/components/common-sidebar';

interface NotificationItem {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      type: 'SUCCESS',
      title: '온보딩 계획 생성 완료',
      message: '마케팅팀 신규 입사자 온보딩 계획 30일차 로드맵이 AI에 의해 성공적으로 생성되었습니다.',
      time: '10분 전',
      isRead: false,
    },
    {
      id: '2',
      type: 'INFO',
      title: '새 문서 업로드',
      message: '‘행사운영가이드_v2.pdf’ 문서가 업로드되어 RAG 인덱싱이 완료되었습니다.',
      time: '1시간 전',
      isRead: false,
    },
    {
      id: '3',
      type: 'WARNING',
      title: '체크리스트 마감 알림',
      message: 'DAY 3 체크리스트 ‘사내 슬랙 및 계정 설정’ 마감 기한이 다가왔습니다.',
      time: '어제',
      isRead: true,
    },
    {
      id: '4',
      type: 'INFO',
      title: '팀원 초대 수락',
      message: '이민수님이 마케팅팀 워크스페이스에 참여하였습니다.',
      time: '2일 전',
      isRead: true,
    },
  ]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const filtered = activeTab === 'all' ? notifications : notifications.filter((n) => !n.isRead);

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle size={18} color="#10B981" />;
      case 'WARNING':
        return <AlertCircle size={18} color="#F59E0B" />;
      default:
        return <Info size={18} color="#6366F1" />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      <CommonSidebar />

      <main style={{ flex: 1, padding: '32px 40px', maxWidth: '1000px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>알림 센터</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
              온보딩 진행 상태, 문서 업데이트 및 주요 이벤트 알림을 확인하세요.
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
              onClick={clearAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#EF4444',
                backgroundColor: '#FFFFFF',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={16} /> 전체 삭제
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
            전체 ({notifications.length})
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
            읽지 않음 ({notifications.filter((n) => !n.isRead).length})
          </button>
        </div>

        {/* Notifications List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '16px 20px',
                backgroundColor: item.isRead ? '#FFFFFF' : '#EEF2FF',
                border: `1px solid ${item.isRead ? '#E5E7EB' : '#C7D2FE'}`,
                borderRadius: '12px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ paddingTop: '2px' }}>{getIcon(item.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    {item.title}
                  </h4>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{item.time}</span>
                </div>
                <p style={{ fontSize: '13.5px', color: '#4B5563', margin: 0, lineHeight: 1.5 }}>
                  {item.message}
                </p>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
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
      </main>
    </div>
  );
}