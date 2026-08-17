'use client';

import React, { useState } from 'react';
import { Send, Plus, RefreshCw, Bell, HelpCircle, Zap } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import styles from './ai-chat.module.css';

export default function AIChatPage() {
  const [selectedChat, setSelectedChat] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const conversations = [
    { id: 1, title: '예산안 사용 지침', time: '10:42', status: '방금 전' },
    { id: 2, title: '행사 운영 정책', time: '09:30', status: '어제' },
    { id: 3, title: '거래처 연락처', time: '16:05', status: '어제' },
    { id: 4, title: '신입 첫 주 해야 할 일', time: '11:22', status: '2일 전' },
    { id: 5, title: '원격사 온보딩 가이드', time: '14:18', status: '3일 전' },
  ];

  const chatMessages = [
    {
      type: 'user',
      text: '이 예산은 언제 사용하나요 ?',
      time: '10:42',
    },
    {
      type: 'ai',
      text: '행사 예산안 v7.xlsx는 행사 기획 단계에서 최초 예산을 세우고, 변경 내역을 반영하며, 최종 결재를 예산안을 만드는 데 사용합니다.',
      time: '10:42',
      citations: [
        { name: '행사_예산안_v7.xlsx', page: 1, type: 'excel' },
        { name: '행사운영가이드.pdf', page: 2, type: 'pdf' },
      ],
    },
    {
      type: 'user',
      text: '예산 변경이 생기면 어떤 절차를 따라야 하나요 ?',
      time: '10:43',
    },
    {
      type: 'ai',
      text: '① 변경 사유 기록 → ② 담당자 검토 → ③ 승인 요청 → ④ 최신본 업로드',
      time: '10:43',
      additionalText: '자세한 내용은 행사운영가이드.pdf 2 페이지를 참고해 주세요.',
    },
  ];

  const suggestedQuestions = [
    '예산안 정정절차 기준이 궁금해요',
    '권자 라인은 어떻게 되나요?',
    '최신 예산안 버전은 무엇인가요?',
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FontAwesomeIcon icon={faFilePdf} className={styles.citationIconPdf} />;
      case 'excel':
        return <FontAwesomeIcon icon={faFileExcel} className={styles.citationIconExcel} />;
      default:
        return null;
    }
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      console.log('Message sent:', inputValue);
      setInputValue('');
    }
  };

  return (
    <div className={styles.container}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>AI 에게 질문</h1>
            <p className={styles.description}>RAG + 권한 검사 + 출처(Citation)를 거친 답변을 제공합니다.</p>
          </div>
          <div className={styles.headerRight}>
            <select className={styles.workspaceBtn}>
              <option>마케팅팀 인수인계</option>
            </select>
            <button className={styles.notifBtn}>
              <Bell size={20} />
            </button>
            <button className={styles.helpBtn}>
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Left - Conversation History */}
          <aside className={styles.conversationPanel}>
            <div className={styles.conversationHeader}>
              <h3 className={styles.conversationTitle}>대화 기록</h3>
              <button className={styles.newChatBtn}>
                <Plus size={16} /> 새 대화
              </button>
            </div>

            <div className={styles.conversationList}>
              {conversations.map((conv, idx) => (
                <button
                  key={conv.id}
                  className={`${styles.conversationItem} ${idx === selectedChat ? styles.activeConversation : ''}`}
                  onClick={() => setSelectedChat(idx)}
                >
                  <div className={styles.convTitle}>{conv.title}</div>
                  <div className={styles.convMeta}>
                    <span className={styles.convTime}>{conv.time}</span>
                    <span className={styles.convStatus}>{conv.status}</span>
                  </div>
                </button>
              ))}
            </div>

            <button className={styles.viewAllLink}>모든 대화 보기 ›</button>
          </aside>

          {/* Right - Chat Area */}
          <div className={styles.chatArea}>
            <div className={styles.messagesContainer}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`${styles.message} ${styles[msg.type]}`}>
                  {msg.type === 'ai' && (
                    <div className={styles.aiAvatar}>M</div>
                  )}
                  <div className={styles.messageContent}>
                    {msg.type === 'ai' && (
                      <div className={styles.aiHeader}>
                        <span className={styles.aiName}>MENTALK</span>
                        <span className={styles.messageTime}>{msg.time}</span>
                      </div>
                    )}
                    <p className={styles.messageText}>{msg.text}</p>
                    {msg.citations && (
                      <div className={styles.citations}>
                        <span className={styles.citationsLabel}>출처</span>
                        {msg.citations.map((citation, i) => (
                          <div key={i} className={styles.citation}>
                            {getFileIcon(citation.type)}
                            <span className={styles.citationText}>
                              {citation.name} · p.{citation.page}
                            </span>
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.additionalText && (
                      <p className={styles.additionalText}>{msg.additionalText}</p>
                    )}
                    {msg.type === 'user' && (
                      <span className={styles.userTime}>{msg.time}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Suggested Questions */}
              <div className={styles.suggestedSection}>
                <h4 className={styles.suggestedTitle}>추천 질문</h4>
                <div className={styles.suggestedQuestions}>
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      className={styles.suggestedQuestion}
                      onClick={() => setInputValue(question)}
                    >
                      <Zap size={16} />
                      {question}
                    </button>
                  ))}
                  <button className={styles.refreshBtn}>
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
              <div className={styles.inputContainer}>
                <input
                  type="text"
                  placeholder="이 인지에 대해 궁금한 내용을 입력하세요..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className={styles.chatInput}
                />
                <button onClick={handleSendMessage} className={styles.sendBtn}>
                  <Send size={20} />
                </button>
              </div>
              <div className={styles.chatFooter}>
                <span className={styles.footerText}>Chat sessions + Citation</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
