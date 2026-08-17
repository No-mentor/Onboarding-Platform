'use client';

import React, { useState } from 'react';
import { Send, Plus, RefreshCw, Bell, HelpCircle, Zap } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { useModalAction } from '@/components/ui/use-modal-action';
import styles from './ai-chat.module.css';

export default function AIChatPage() {
  const { run, isPending } = useModalAction();
  const [selectedChat, setSelectedChat] = useState(0);
  const [inputValue, setInputValue] = useState('');

  // Modal states
  const [isChatContextModalOpen, setIsChatContextModalOpen] = useState(false);
  const [isAICitationModalOpen, setIsAICitationModalOpen] = useState(false);
  const [isDocumentReferenceModalOpen, setIsDocumentReferenceModalOpen] = useState(false);
  const [isChatFollowupModalOpen, setIsChatFollowupModalOpen] = useState(false);
  const [isSearchSimilarModalOpen, setIsSearchSimilarModalOpen] = useState(false);
  const [isQuestionDetailsModalOpen, setIsQuestionDetailsModalOpen] = useState(false);
  const [isAIResponseModalOpen, setIsAIResponseModalOpen] = useState(false);

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
              <button className={styles.newChatBtn} onClick={() => setIsChatContextModalOpen(true)}>
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
                          <div key={i} className={styles.citation} onClick={() => setIsAICitationModalOpen(true)} style={{ cursor: 'pointer' }}>
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

      {/* MODALS */}

      {/* 1. Chat Context Modal */}
      {isChatContextModalOpen && (
        <Modal
          open
          onClose={() => setIsChatContextModalOpen(false)}
          title="새 대화 시작"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsChatContextModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('ai-chat-0')}
                onClick={() => run('ai-chat-0', '처리를 완료했습니다.', () => setIsChatContextModalOpen(false))}
              >
                대화 시작
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>대화 주제</label>
            <input type="text" placeholder="예: 예산안 사용 지침" className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>참고 자료</label>
            <select className={styles.select}>
              <option>자료 선택</option>
              <option>행사운영가이드.pdf</option>
              <option>예산안_v7.xlsx</option>
            </select>
          </div>
        </Modal>
      )}

      {/* 2. AI Citation Modal */}
      {isAICitationModalOpen && (
        <Modal
          open
          onClose={() => setIsAICitationModalOpen(false)}
          title="출처 정보"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsAICitationModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.citationCard}>
            <div className={styles.citationHeader}>
              <span className={styles.citationFileName}>행사_예산안_v7.xlsx</span>
              <span className={styles.citationPage}>Page 1</span>
            </div>
            <p className={styles.citationDesc}>이 출처는 AI의 답변을 생성하는 데 사용되었습니다.</p>
            <div className={styles.citationActions}>
              <button className={styles.citationBtn}>파일 열기</button>
              <button className={styles.citationBtn}>더 자세히</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Document Reference Modal */}
      {isDocumentReferenceModalOpen && (
        <Modal
          open
          onClose={() => setIsDocumentReferenceModalOpen(false)}
          title="참고 문서"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsDocumentReferenceModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.documentList}>
            <div className={styles.docItem}>행사_예산안_v7.xlsx</div>
            <div className={styles.docItem}>행사운영가이드.pdf</div>
            <div className={styles.docItem}>거래처_연락망.xlsx</div>
          </div>
        </Modal>
      )}

      {/* 4. Chat Followup Modal */}
      {isChatFollowupModalOpen && (
        <Modal
          open
          onClose={() => setIsChatFollowupModalOpen(false)}
          title="추가 질문"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsChatFollowupModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.followupList}>
            <button className={styles.followupItem}>예산 변경 절차는?</button>
            <button className={styles.followupItem}>승인자 라인은?</button>
            <button className={styles.followupItem}>최신 버전은?</button>
          </div>
        </Modal>
      )}

      {/* 5. Search Similar Modal */}
      {isSearchSimilarModalOpen && (
        <Modal
          open
          onClose={() => setIsSearchSimilarModalOpen(false)}
          title="유사 질문"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsSearchSimilarModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.similarList}>
            <div className={styles.similarItem}>
              <span>예산안 정정 절차가 궁금합니다</span>
              <span className={styles.relevance}>97% 관련</span>
            </div>
            <div className={styles.similarItem}>
              <span>예산 변경 승인 프로세스는?</span>
              <span className={styles.relevance}>94% 관련</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Question Details Modal */}
      {isQuestionDetailsModalOpen && (
        <Modal
          open
          onClose={() => setIsQuestionDetailsModalOpen(false)}
          title="질문 상세"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsQuestionDetailsModalOpen(false)}>닫기</ModalSecondaryButton>
            </>
          }
        >
          <div className={styles.questionCard}>
            <h4>이 예산은 언제 사용하나요?</h4>
            <div className={styles.questionMeta}>
              <span>시간: 10:42</span>
              <span>관련 문서: 2개</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. AI Response Modal */}
      {isAIResponseModalOpen && (
        <Modal
          open
          onClose={() => setIsAIResponseModalOpen(false)}
          title="AI 응답"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsAIResponseModalOpen(false)}>닫기</ModalSecondaryButton>
              <ModalPrimaryButton
                loading={isPending('ai-chat-1')}
                onClick={() => run('ai-chat-1', '처리를 완료했습니다.', () => setIsAIResponseModalOpen(false))}
              >
                더 알아보기
              </ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.responseCard}>
            <p>행사 예산안 v7.xlsx는 행사 기획 단계에서 최초 예산을 세우고, 변경 내역을 반영하며, 최종 결재를 예산안을 만드는 데 사용합니다.</p>
            <div className={styles.responseStats}>
              <div className={styles.stat}>신뢰도: 98%</div>
              <div className={styles.stat}>출처: 2개</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
