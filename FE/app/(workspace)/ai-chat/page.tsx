'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Send, Plus, RefreshCw, Bell, HelpCircle, Zap, FileText, Bot, 
  Search, Trash2, Copy, Check, ThumbsUp, ThumbsDown, CornerDownRight, ExternalLink 
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel, faFileWord } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton, ModalDangerButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import { useToast } from '@/components/ui/toast';
import { getChatSessions, getChatSessionDetail, sendChatMessage, deleteChatSession } from '@/lib/api';
import styles from './ai-chat.module.css';

const ALL_SUGGESTED_QUESTIONS = [
  '입사 첫 주에 필수로 해야 하는 체크리스트는 무엇인가요?',
  '사내 복지 및 근무 시간(출퇴근 규정)을 알려주세요.',
  '로컬 개발 환경 세팅과 서버 실행 방법이 궁금해요.',
  '업무 협업 도구(Slack, Jira, GitHub) 연동 가이드가 있나요?',
  '30일 온보딩 로드맵은 어떻게 진행되나요?',
  '사내 보안 수칙 및 VPN 설치 가이드가 궁금해요.',
  '신규 입사자 업무 매뉴얼 핵심 요약해 줘.',
  '팀 멘토와의 1:1 온보딩 미팅 일정은 어떻게 되나요?',
];

export default function AIChatPage() {
  const router = useRouter();
  const { run, isPending } = useModalAction();
  const { showToast } = useToast();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [suggestedIndex, setSuggestedIndex] = useState(0);

  // Reaction & copy states
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<number, 'up' | 'down'>>({});

  // Citation modal state
  const [isAICitationModalOpen, setIsAICitationModalOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<any>(null);

  // Delete session modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const [conversations, setConversations] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isSending]);

  const normalizeMessage = (m: any) => {
    const isUser = m.role === 'user' || m.type === 'user';
    const time = m.createdAt
      ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : (m.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    const rawCitations = m.citations || [];
    const citations = Array.isArray(rawCitations)
      ? rawCitations.map((c: any) => ({
          name: c.title || c.name || '사내 문서',
          title: c.title || c.name || '사내 문서',
          page: c.page || 1,
          snippet: c.snippet || c.content || '',
          documentId: c.documentId || '',
          type: (c.title || '').endsWith('.pdf')
            ? 'pdf'
            : (c.title || '').endsWith('.xlsx') || (c.title || '').endsWith('.xls')
            ? 'excel'
            : (c.title || '').endsWith('.docx') || (c.title || '').endsWith('.doc')
            ? 'word'
            : 'doc',
        }))
      : [];

    return {
      id: m.id || String(Math.random()),
      type: isUser ? 'user' : 'ai',
      role: isUser ? 'user' : 'assistant',
      text: m.content || m.text || '',
      content: m.content || m.text || '',
      time,
      citations,
    };
  };

  // Load chat sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const response = await getChatSessions();
      const items = response.items || [];
      setConversations(items);
      if (items.length > 0 && !selectedChat) {
        setSelectedChat(items[0].id);
        const detail = await getChatSessionDetail(items[0].id);
        const normalized = (detail.messages || []).map(normalizeMessage);
        setChatMessages(normalized);
      }
    } catch (err) {
      console.error('채팅 세션 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = async (id: string) => {
    setSelectedChat(id);
    try {
      const detail = await getChatSessionDetail(id);
      const normalized = (detail.messages || []).map(normalizeMessage);
      setChatMessages(normalized);
    } catch (err) {
      console.error('세션 상세 로드 실패:', err);
    }
  };

  const handleStartNewChat = () => {
    setSelectedChat(null);
    setChatMessages([]);
  };

  const handleCycleSuggestions = () => {
    setSuggestedIndex((prev) => (prev + 3) % ALL_SUGGESTED_QUESTIONS.length);
  };

  const currentSuggestions = [
    ALL_SUGGESTED_QUESTIONS[suggestedIndex % ALL_SUGGESTED_QUESTIONS.length],
    ALL_SUGGESTED_QUESTIONS[(suggestedIndex + 1) % ALL_SUGGESTED_QUESTIONS.length],
    ALL_SUGGESTED_QUESTIONS[(suggestedIndex + 2) % ALL_SUGGESTED_QUESTIONS.length],
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FontAwesomeIcon icon={faFilePdf} className={styles.citationIconPdf} />;
      case 'excel':
        return <FontAwesomeIcon icon={faFileExcel} className={styles.citationIconExcel} />;
      case 'word':
        return <FontAwesomeIcon icon={faFileWord} style={{ color: '#2563EB', marginRight: '6px' }} />;
      default:
        return <FileText size={14} style={{ color: '#6B7280', marginRight: '6px' }} />;
    }
  };

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || isSending) return;
    const userText = text.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setInputValue('');

    // Optimistic user message
    setChatMessages((prev) => [
      ...prev,
      {
        id: String(Math.random()),
        type: 'user',
        role: 'user',
        text: userText,
        content: userText,
        time: timeStr,
        citations: [],
      },
    ]);
    setIsSending(true);

    try {
      const response = await sendChatMessage(userText, selectedChat || undefined);
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const answerText = (response as any).answer || (response as any).content || '답변을 생성했습니다.';

      const rawCitations = (response as any).citations || [];
      const formattedCitations = Array.isArray(rawCitations)
        ? rawCitations.map((c: any) => ({
            name: c.title || c.name || '사내 문서',
            title: c.title || c.name || '사내 문서',
            page: c.page || 1,
            snippet: c.snippet || c.content || '',
            documentId: c.documentId || '',
            type: (c.title || '').endsWith('.pdf')
              ? 'pdf'
              : (c.title || '').endsWith('.xlsx') || (c.title || '').endsWith('.xls')
              ? 'excel'
              : (c.title || '').endsWith('.docx') || (c.title || '').endsWith('.doc')
              ? 'word'
              : 'doc',
          }))
        : [];

      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Math.random()),
          type: 'ai',
          role: 'assistant',
          text: answerText,
          content: answerText,
          time: aiTime,
          citations: formattedCitations,
        },
      ]);

      if (response.sessionId && response.sessionId !== selectedChat) {
        setSelectedChat(response.sessionId);
        // Refresh session list in sidebar
        const refreshedSessions = await getChatSessions();
        setConversations(refreshedSessions.items || []);
      }
    } catch (err: any) {
      console.error('메시지 전송 실패:', err);
      showToast(err.message || '메시지 전송에 실패했습니다', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = () => {
    sendMessageWithText(inputValue);
  };

  const handleOpenCitation = (citation: any) => {
    setSelectedCitation(citation);
    setIsAICitationModalOpen(true);
  };

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    showToast('답변이 클립보드에 복사되었습니다.', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFeedback = (idx: number, type: 'up' | 'down') => {
    setFeedbackMap((prev) => ({ ...prev, [idx]: type }));
    showToast(type === 'up' ? '피드백이 반영되었습니다! 👍' : '피드백을 남겨주셔서 감사합니다. 🙇‍♂️', 'info');
  };

  const confirmDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteChatSession(sessionToDelete);
      showToast('대화가 삭제되었습니다.', 'success');
      const refreshed = conversations.filter((c) => c.id !== sessionToDelete);
      setConversations(refreshed);
      if (selectedChat === sessionToDelete) {
        if (refreshed.length > 0) {
          handleSelectChat(refreshed[0].id);
        } else {
          handleStartNewChat();
        }
      }
    } catch (err) {
      console.error('세션 삭제 실패:', err);
      showToast('대화 삭제에 실패했습니다.', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setSessionToDelete(null);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const title = conv.title || conv.question || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getFollowupQuestions = (lastMsgText: string) => {
    if (lastMsgText.includes('체크리스트') || lastMsgText.includes('과제')) {
      return ['체크리스트 상세 항목 확인하기', '마감 기한 연장 가능한가요?', '담당 멘토에게 문의하기'];
    }
    if (lastMsgText.includes('개발') || lastMsgText.includes('환경') || lastMsgText.includes('서버')) {
      return ['DB 접속 정보는 어디서 확인하나요?', '사내 Git 브랜치 전략이 궁금해요', 'Docker 환경 설정 방법'];
    }
    if (lastMsgText.includes('복지') || lastMsgText.includes('휴가') || lastMsgText.includes('근무')) {
      return ['연차 신청 절차가 어떻게 되나요?', '점심 식대 지원 기준', '사내 동호회 지원 안내'];
    }
    return ['이와 관련된 사내 담당자 알려줘', '30일 온보딩 로드맵 보기', '관련 사내 문서 원문 확인'];
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, lineIdx) => {
      // Bold handling
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={lineIdx} style={{ minHeight: line.trim() ? 'auto' : '10px', marginBottom: '2px' }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} style={{ fontWeight: 600, color: '#111827' }}>{part.slice(2, -2)}</strong>;
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className={styles.container}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>AI 온보딩 어시스턴트</h1>
            <p className={styles.description}>사내 지식 베이스(RAG)와 권한 검증을 거쳐 정확한 출처와 함께 답변을 제공합니다.</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.workspaceBtn} onClick={() => router.push('/workspace-selection')}>
              워크스페이스 전환
            </button>
            <button className={styles.notifBtn} onClick={() => router.push('/notification-center')}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn} onClick={() => router.push('/ai-chat')}>
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Left - Conversation History */}
          <aside className={styles.conversationPanel}>
            <div className={styles.conversationHeader}>
              <h3 className={styles.conversationTitle}>대화 기록</h3>
              <button className={styles.newChatBtn} onClick={handleStartNewChat}>
                <Plus size={16} /> 새 대화
              </button>
            </div>

            {/* Session Search */}
            <div className={styles.searchWrapper}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="대화 기록 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.conversationList}>
              {filteredConversations.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                  {searchQuery ? '검색된 대화가 없습니다.' : '진행 중인 대화가 없습니다.'}
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div key={conv.id} className={styles.convItemContainer}>
                    <button
                      className={`${styles.conversationItem} ${conv.id === selectedChat ? styles.activeConversation : ''}`}
                      onClick={() => handleSelectChat(conv.id)}
                    >
                      <div className={styles.convTitle}>{conv.title || conv.question || '새로운 대화'}</div>
                      <div className={styles.convMeta}>
                        <span className={styles.convTime}>{conv.createdAt ? new Date(conv.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                    </button>
                    <button
                      className={styles.deleteConvBtn}
                      onClick={(e) => confirmDeleteSession(conv.id, e)}
                      title="대화 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Right - Chat Area */}
          <div className={styles.chatArea}>
            <div className={styles.messagesContainer}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      backgroundColor: '#EDE9FE',
                      color: '#6C46A2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <Bot size={28} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                    무엇이든 물어보세요!
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6B7280', maxWidth: '420px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                    회사 규정, 30일 온보딩 계획, 도구 설정 방법 등 궁금한 내용을 입력하시면 업로드된 사내 문서를 바탕으로 AI가 즉시 답변합니다.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`${styles.message} ${styles[msg.type]}`}>
                    {msg.type === 'ai' && <div className={styles.aiAvatar}>M</div>}
                    <div className={styles.messageContent}>
                      {msg.type === 'ai' && (
                        <div className={styles.aiHeader}>
                          <span className={styles.aiName}>MENTALK</span>
                          <span className={styles.messageTime}>{msg.time}</span>
                        </div>
                      )}
                      <div className={styles.messageText} style={{ lineHeight: 1.6 }}>
                        {renderFormattedContent(msg.text)}
                      </div>

                      {/* Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className={styles.citations}>
                          <span className={styles.citationsLabel}>근거 출처</span>
                          {msg.citations.map((citation: any, i: number) => (
                            <div
                              key={i}
                              className={styles.citation}
                              onClick={() => handleOpenCitation(citation)}
                              style={{ cursor: 'pointer' }}
                              title="출처 내용 자세히 보기"
                            >
                              {getFileIcon(citation.type)}
                              <span className={styles.citationText}>
                                {citation.name} {citation.page ? `· p.${citation.page}` : ''}
                              </span>
                              <span style={{ marginLeft: '4px', fontSize: '11px', opacity: 0.7 }}>[{i + 1}]</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* AI Message Actions (Copy & Reactions) */}
                      {msg.type === 'ai' && (
                        <div className={styles.messageActions}>
                          <button
                            className={styles.actionIconBtn}
                            onClick={() => handleCopyMessage(msg.text, idx)}
                            title="답변 복사"
                          >
                            {copiedIndex === idx ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                            <span>{copiedIndex === idx ? '복사됨' : '복사'}</span>
                          </button>
                          <button
                            className={`${styles.actionIconBtn} ${feedbackMap[idx] === 'up' ? styles.active : ''}`}
                            onClick={() => handleFeedback(idx, 'up')}
                            title="도움이 되었어요"
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button
                            className={`${styles.actionIconBtn} ${feedbackMap[idx] === 'down' ? styles.active : ''}`}
                            onClick={() => handleFeedback(idx, 'down')}
                            title="아쉬워요"
                          >
                            <ThumbsDown size={12} />
                          </button>
                        </div>
                      )}

                      {/* Follow-up Prompts for the latest AI message */}
                      {msg.type === 'ai' && idx === chatMessages.length - 1 && !isSending && (
                        <div className={styles.followupSection}>
                          <span className={styles.followupLabel}>💡 이어서 질문하기</span>
                          <div className={styles.followupChips}>
                            {getFollowupQuestions(msg.text).map((fQuestion, fIdx) => (
                              <button
                                key={fIdx}
                                className={styles.followupChip}
                                onClick={() => sendMessageWithText(fQuestion)}
                              >
                                <CornerDownRight size={11} />
                                <span>{fQuestion}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.type === 'user' && <span className={styles.userTime}>{msg.time}</span>}
                    </div>
                  </div>
                ))
              )}

              {/* AI Generating Indicator */}
              {isSending && (
                <div className={`${styles.message} ${styles.ai}`}>
                  <div className={styles.aiAvatar}>M</div>
                  <div className={styles.messageContent}>
                    <div className={styles.aiHeader}>
                      <span className={styles.aiName}>MENTALK</span>
                      <span className={styles.messageTime}>답변 생성 중...</span>
                    </div>
                    <p className={styles.messageText} style={{ color: '#6B7280', fontStyle: 'italic' }}>
                      사내 문서를 검색하고 답변을 작성하고 있습니다...
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />

              {/* Suggested Questions Section */}
              <div className={styles.suggestedSection} style={{ marginTop: 'auto', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 className={styles.suggestedTitle} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={16} color="#4F46E5" /> 추천 온보딩 질문
                  </h4>
                  <button
                    className={styles.refreshBtn}
                    onClick={handleCycleSuggestions}
                    title="다른 추천 질문 보기"
                    style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#6B7280' }}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className={styles.suggestedQuestions}>
                  {currentSuggestions.map((question, idx) => (
                    <button
                      key={idx}
                      className={styles.suggestedQuestion}
                      onClick={() => sendMessageWithText(question)}
                      disabled={isSending}
                    >
                      <Zap size={14} />
                      <span>{question}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
              <div className={styles.inputContainer}>
                <input
                  type="text"
                  placeholder="궁금한 업무 및 온보딩 내용을 질문해 보세요... (Enter 키로 전송)"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isSending}
                  className={styles.chatInput}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isSending}
                  className={styles.sendBtn}
                  style={{ opacity: !inputValue.trim() || isSending ? 0.5 : 1 }}
                >
                  <Send size={18} />
                </button>
              </div>
              <div className={styles.chatFooter}>
                <span className={styles.footerText}>
                  OnboardOS AI Assistant • 사내 문서 기반 검증 답변 (Citation 지원)
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* CITATION MODAL */}
      {isAICitationModalOpen && selectedCitation && (
        <Modal
          open
          onClose={() => setIsAICitationModalOpen(false)}
          title="문서 출처 상세 정보"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsAICitationModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton onClick={() => router.push('/file-management')}>
                문서 관리함으로 이동
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.citationCard}>
            <div className={styles.citationHeader} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              {getFileIcon(selectedCitation.type)}
              <span className={styles.citationFileName} style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                {selectedCitation.title}
              </span>
              {selectedCitation.page && (
                <span style={{ fontSize: '12px', background: '#F3F4F6', padding: '2px 8px', borderRadius: '12px', color: '#4B5563' }}>
                  p.{selectedCitation.page}
                </span>
              )}
            </div>

            {selectedCitation.snippet && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  color: '#374151',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                  marginBottom: '14px',
                }}
              >
                {selectedCitation.snippet}
              </div>
            )}

            <p className={styles.citationDesc} style={{ fontSize: '12.5px', color: '#6B7280', margin: 0 }}>
              💡 이 문서는 AI가 답변을 구성하기 위해 참조한 정식 사내 지식 베이스 문서입니다.
            </p>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <Modal
          open
          onClose={() => setIsDeleteModalOpen(false)}
          title="대화 삭제"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDeleteModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalDangerButton onClick={handleDeleteSession}>
                삭제하기
              </ModalDangerButton>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
            선택한 대화 기록을 삭제하시겠습니까?<br />
            삭제된 대화는 복구할 수 없습니다.
          </p>
        </Modal>
      )}
    </div>
  );
}
