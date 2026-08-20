'use client';

import React, { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Plus, RefreshCw, HelpCircle, Zap } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { CommonSidebar } from '@/components/common-sidebar';
import { Modal, ModalPrimaryButton, ModalSecondaryButton } from '@/components/ui/modal';
import { Markdown } from '@/components/ui/markdown';
import { useToast } from '@/components/ui/toast';
import { useMe } from '@/components/require-workspace';
import { saveWorkspaceId } from '@/lib/storage';
import { getDisplayLabel } from '@/lib/display-labels';
import {
  formatFileType,
  getChatSessionDetail,
  getChatSessions,
  getDocuments,
  sendChatMessage,
  type ChatCitation,
  type ChatSessionSummaryResponse,
  type DocumentResponse,
} from '@/lib/api';
import styles from './ai-chat.module.css';

/** 화면에 그리는 한 줄. 서버 메시지와 방금 보낸 질문을 같은 모양으로 다룬다 */
interface ChatLine {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
  citations: ChatCitation[];
  /** 권한으로 제외된 문서가 있을 때 답변 아래에 덧붙이는 안내 */
  note?: string;
}

function formatTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

/** 세션 목록의 '어제 / 3일 전' 같은 표기 */
function relativeDay(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  return `${days}일 전`;
}

function AIChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const me = useMe();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<ChatSessionSummaryResponse[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [isDocumentReferenceModalOpen, setIsDocumentReferenceModalOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<ChatCitation | null>(null);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  const [newChatQuestion, setNewChatQuestion] = useState('');
  const [newChatDocumentId, setNewChatDocumentId] = useState('');

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const response = await getChatSessions();
      setSessions(response.items ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '대화 기록을 불러오지 못했습니다.', 'error');
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [showToast]);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await getDocuments({ page: 0, size: 20, status: 'READY' });
      setDocuments(response.items ?? []);
    } catch {
      // 문서를 못 받아도 대화 자체는 가능해야 한다
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    // 진입 시 대화 기록과 참고 문서를 함께 받아 둔다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSessions();
    void loadDocuments();
  }, [loadSessions, loadDocuments]);

  const openSession = useCallback(
    async (sessionId: string) => {
      setSelectedSessionId(sessionId);
      setIsLoadingMessages(true);
      try {
        const detail = await getChatSessionDetail(sessionId);
        setLines(
          (detail.messages ?? []).map(message => ({
            id: message.id,
            role: message.role === 'user' ? 'user' : 'assistant',
            text: message.content,
            time: formatTime(message.createdAt),
            citations: message.citations ?? [],
          }))
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : '대화를 불러오지 못했습니다.', 'error');
        setLines([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [showToast]
  );

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question) return;

      setIsSending(true);
      // 보낸 질문은 서버 응답을 기다리지 않고 바로 붙여 준다
      setLines(prev => [
        ...prev,
        { id: `local-${prev.length}`, role: 'user', text: question, time: formatTime(new Date().toISOString()), citations: [] },
      ]);
      setInputValue('');

      try {
        const result = await sendChatMessage(question, selectedSessionId ?? undefined);
        const deniedCount = result.permissionDeniedDocumentIds?.length ?? 0;
        setLines(prev => [
          ...prev,
          {
            id: result.messageId,
            role: 'assistant',
            text: result.answer,
            time: formatTime(result.createdAt),
            citations: result.citations ?? [],
            note:
              deniedCount > 0
                ? `권한이 없어 답변에 쓰지 못한 문서가 ${deniedCount}개 있습니다. 관리자에게 접근 권한을 요청해 주세요.`
                : undefined,
          },
        ]);
        if (deniedCount > 0) {
          showToast('일부 문서는 권한이 없어 답변에 사용되지 않았습니다.', 'error');
        }
        // 새 대화였다면 서버가 만든 세션으로 이어 간다
        if (!selectedSessionId) {
          setSelectedSessionId(result.sessionId);
          await loadSessions();
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : '질문 전송에 실패했습니다.', 'error');
      } finally {
        setIsSending(false);
      }
    },
    [selectedSessionId, showToast, loadSessions]
  );

  // 다른 화면에서 ?q= 로 넘어온 질문은 새 대화로 바로 보낸다
  const initialQuestion = searchParams.get('q');
  useEffect(() => {
    if (!initialQuestion) return;
    // 질문 전송이 곧바로 화면에 한 줄을 붙이는 것은 의도한 동작이다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void send(initialQuestion);
    router.replace('/ai-chat');
    // send/router 를 넣으면 질문이 다시 전송되므로 질문 문자열만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  /** 추천 질문은 실제로 학습이 끝난 문서에서 만든다 */
  const suggestedQuestions = useMemo(
    () => documents.slice(0, 3).map(doc => `${doc.title} 내용을 요약해 줘`),
    [documents]
  );

  const selectedLine = useMemo(
    () => lines.find(line => line.id === selectedLineId) ?? null,
    [lines, selectedLineId]
  );

  /** 질문 상세에서 보여줄 "관련 문서" 수 = 바로 뒤 답변의 출처 개수 */
  const selectedLineCitationCount = useMemo(() => {
    if (!selectedLine) return 0;
    const index = lines.findIndex(line => line.id === selectedLine.id);
    return lines[index + 1]?.citations.length ?? 0;
  }, [lines, selectedLine]);

  const getCitationIcon = (citation: ChatCitation) => {
    const type = formatFileType(null, citation.title);
    if (type === 'PDF') return <FontAwesomeIcon icon={faFilePdf} className={styles.citationIconPdf} />;
    if (type === 'XLSX' || type === 'XLS' || type === 'CSV') {
      return <FontAwesomeIcon icon={faFileExcel} className={styles.citationIconExcel} />;
    }
    return null;
  };

  const handleStartNewChat = () => {
    const document = documents.find(doc => doc.id === newChatDocumentId);
    const question = [newChatQuestion.trim(), document ? `(참고 문서: ${document.title})` : '']
      .filter(Boolean)
      .join(' ');
    if (!question) {
      showToast('첫 질문을 입력해 주세요.', 'error');
      return;
    }
    // 세션을 비우면 서버가 새 세션을 만들어 준다
    setSelectedSessionId(null);
    setLines([]);
    setIsNewChatModalOpen(false);
    setNewChatQuestion('');
    setNewChatDocumentId('');
    void send(question);
  };

  return (
    <div className={styles.container}>
      <CommonSidebar />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>AI에게 질문</h1>
            <p className={styles.description}>문서 검색 증강과 권한 검사, 출처 확인을 거친 답변을 제공합니다.</p>
          </div>
          <div className={styles.headerRight}>
            <select
              className={styles.workspaceBtn}
              value={me?.currentWorkspace?.id ?? ''}
              onChange={(e) => {
                if (!e.target.value || e.target.value === me?.currentWorkspace?.id) return;
                saveWorkspaceId(e.target.value);
                window.location.reload();
              }}
              aria-label="업무 공간 전환"
            >
              {(me?.workspaces ?? []).map(workspace => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
            <button className={styles.helpBtn} onClick={() => setIsDocumentReferenceModalOpen(true)} title="참고 문서 보기">
              <HelpCircle size={18} />
            </button>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Left - Conversation History */}
          <aside className={styles.conversationPanel}>
            <div className={styles.conversationHeader}>
              <h3 className={styles.conversationTitle}>대화 기록</h3>
              <button className={styles.newChatBtn} onClick={() => setIsNewChatModalOpen(true)}>
                <Plus size={16} /> 새 대화
              </button>
            </div>

            <div className={styles.conversationList}>
              {isLoadingSessions ? (
                <div className={styles.convMeta}>불러오는 중...</div>
              ) : sessions.length === 0 ? (
                <div className={styles.convMeta}>아직 대화가 없습니다. 질문을 보내면 기록이 만들어집니다.</div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    className={`${styles.conversationItem} ${session.id === selectedSessionId ? styles.activeConversation : ''}`}
                    onClick={() => void openSession(session.id)}
                  >
                    <div className={styles.convTitle}>{session.title || '제목 없는 대화'}</div>
                    <div className={styles.convMeta}>
                      <span className={styles.convTime}>{formatTime(session.updatedAt)}</span>
                      <span className={styles.convStatus}>{relativeDay(session.updatedAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button className={styles.viewAllLink} onClick={() => void loadSessions()}>
              대화 기록 새로 고침 ›
            </button>
          </aside>

          {/* Right - Chat Area */}
          <div className={styles.chatArea}>
            <div className={styles.messagesContainer}>
              {isLoadingMessages ? (
                <div className={styles.messageTime}>대화를 불러오는 중...</div>
              ) : lines.length === 0 ? (
                <div className={styles.messageTime}>
                  업로드된 문서를 근거로 답변합니다. 아래에 궁금한 내용을 입력해 보세요.
                </div>
              ) : (
                lines.map((line) => (
                  <div
                    key={line.id}
                    className={`${styles.message} ${styles[line.role === 'user' ? 'user' : 'ai']}`}
                    onClick={() => setSelectedLineId(line.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {line.role === 'assistant' && <div className={styles.aiAvatar}>M</div>}
                    <div className={styles.messageContent}>
                      {line.role === 'assistant' && (
                        <div className={styles.aiHeader}>
                          <span className={styles.aiName}>MENTALK</span>
                          <span className={styles.messageTime}>{line.time}</span>
                        </div>
                      )}
                      {line.role === 'assistant' ? (
                        <Markdown text={line.text} className={styles.messageText} />
                      ) : (
                        <p className={styles.messageText}>{line.text}</p>
                      )}
                      {line.citations.length > 0 && (
                        <div className={styles.citations}>
                          <span className={styles.citationsLabel}>출처</span>
                          {line.citations.map((citation, i) => (
                            <div
                              key={`${citation.chunkId ?? citation.documentId ?? i}`}
                              className={styles.citation}
                              onClick={() => { setSelectedCitation(citation); setIsCitationModalOpen(true); }}
                              style={{ cursor: 'pointer' }}
                            >
                              {getCitationIcon(citation)}
                              <span className={styles.citationText}>
                                {citation.title ?? '참고 문서'}
                                {citation.page ? ` · ${citation.page}쪽` : ''}
                              </span>
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      )}
                      {line.note && <p className={styles.additionalText}>{line.note}</p>}
                      {line.role === 'user' && <span className={styles.userTime}>{line.time}</span>}
                    </div>
                  </div>
                ))
              )}

              {isSending && <div className={styles.messageTime}>답변을 만드는 중입니다...</div>}

              {/* Suggested Questions */}
              {suggestedQuestions.length > 0 && (
                <div className={styles.suggestedSection}>
                  <h4 className={styles.suggestedTitle}>추천 질문</h4>
                  <div className={styles.suggestedQuestions}>
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        className={styles.suggestedQuestion}
                        onClick={() => setInputValue(question)}
                      >
                        <Zap size={16} />
                        {question}
                      </button>
                    ))}
                    <button className={styles.refreshBtn} onClick={() => void loadDocuments()} aria-label="추천 질문 새로 고침">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
              <div className={styles.inputContainer}>
                <input
                  type="text"
                  placeholder="업무 문서에서 궁금한 내용을 입력하세요..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isSending) void send(inputValue); }}
                  className={styles.chatInput}
                  disabled={isSending}
                />
                <button onClick={() => void send(inputValue)} className={styles.sendBtn} disabled={isSending}>
                  <Send size={20} />
                </button>
              </div>
              <div className={styles.chatFooter}>
                <span className={styles.footerText}>
                  {selectedSessionId ? '이어지는 대화 · 출처 제공' : '새 대화 · 출처 제공'}
                </span>
                <button className={styles.viewAllLink} onClick={() => setIsFollowupModalOpen(true)}>
                  추가 질문 제안 ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}

      {/* 1. 새 대화 시작 */}
      {isNewChatModalOpen && (
        <Modal
          open
          onClose={() => setIsNewChatModalOpen(false)}
          title="새 대화 시작"
          footer={
            <>
              <ModalSecondaryButton onClick={() => setIsNewChatModalOpen(false)}>취소</ModalSecondaryButton>
              <ModalPrimaryButton onClick={handleStartNewChat}>대화 시작</ModalPrimaryButton>
            </>
          }
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>첫 질문</label>
            <input
              type="text"
              placeholder="예: 예산안 사용 지침을 알려 줘"
              className={styles.input}
              value={newChatQuestion}
              onChange={(e) => setNewChatQuestion(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>참고 자료 (선택)</label>
            <select
              className={styles.select}
              value={newChatDocumentId}
              onChange={(e) => setNewChatDocumentId(e.target.value)}
            >
              <option value="">자료 선택 없이 질문</option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.title}</option>
              ))}
            </select>
          </div>
        </Modal>
      )}

      {/* 2. 출처 정보 */}
      {isCitationModalOpen && selectedCitation && (
        <Modal
          open
          onClose={() => setIsCitationModalOpen(false)}
          title="출처 정보"
          footer={<ModalSecondaryButton onClick={() => setIsCitationModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.citationCard}>
            <div className={styles.citationHeader}>
              <span className={styles.citationFileName}>{selectedCitation.title ?? '참고 문서'}</span>
              {selectedCitation.page && <span className={styles.citationPage}>{selectedCitation.page}쪽</span>}
            </div>
            <p className={styles.citationDesc}>
              {selectedCitation.snippet ?? '이 출처가 답변을 만드는 데 사용되었습니다.'}
            </p>
            <div className={styles.citationActions}>
              <button
                className={styles.citationBtn}
                disabled={!selectedCitation.documentId}
                onClick={() => {
                  setIsCitationModalOpen(false);
                  router.push(`/document-detail?id=${selectedCitation.documentId}`);
                }}
              >
                파일 열기
              </button>
              <button
                className={styles.citationBtn}
                onClick={() => {
                  setIsCitationModalOpen(false);
                  router.push('/file-management');
                }}
              >
                파일 탐색으로 이동
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. 추가 질문 제안 (실제 문서에서 만든다) */}
      {isFollowupModalOpen && (
        <Modal
          open
          onClose={() => setIsFollowupModalOpen(false)}
          title="추가 질문"
          subtitle="준비 완료된 문서를 바탕으로 만든 제안입니다."
          footer={<ModalSecondaryButton onClick={() => setIsFollowupModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.followupList}>
            {documents.length === 0 ? (
              <div className={styles.followupItem}>준비 완료된 문서가 없어 제안할 질문이 없습니다.</div>
            ) : (
              documents.slice(0, 6).map((doc) => (
                <button
                  key={doc.id}
                  className={styles.followupItem}
                  onClick={() => {
                    setIsFollowupModalOpen(false);
                    void send(`${doc.title} 에서 지금 확인해야 할 내용은?`);
                  }}
                >
                  {doc.title} 에서 지금 확인해야 할 내용은?
                </button>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* 4. 메시지 상세 */}
      {selectedLine && (
        <Modal
          open
          onClose={() => setSelectedLineId(null)}
          title={selectedLine.role === 'user' ? '질문 상세' : '인공지능 응답'}
          footer={<ModalSecondaryButton onClick={() => setSelectedLineId(null)}>닫기</ModalSecondaryButton>}
        >
          {selectedLine.role === 'user' ? (
            <div className={styles.questionCard}>
              <h4>{selectedLine.text}</h4>
              <div className={styles.questionMeta}>
                <span>시간: {selectedLine.time || '방금'}</span>
                <span>관련 문서: {selectedLineCitationCount}개</span>
              </div>
            </div>
          ) : (
            <div className={styles.responseCard}>
              <Markdown text={selectedLine.text} />
              <div className={styles.responseStats}>
                <div className={styles.stat}>출처: {selectedLine.citations.length}개</div>
                <div className={styles.stat}>시간: {selectedLine.time || '방금'}</div>
              </div>
              {selectedLine.note && <p className={styles.additionalText}>{selectedLine.note}</p>}
            </div>
          )}
        </Modal>
      )}

      {/* 5. 참고 문서 목록 */}
      {isDocumentReferenceModalOpen && (
        <Modal
          open
          onClose={() => setIsDocumentReferenceModalOpen(false)}
          title="답변에 쓸 수 있는 문서"
          subtitle="학습이 끝난(준비 완료) 문서만 답변 근거로 쓰입니다."
          footer={<ModalSecondaryButton onClick={() => setIsDocumentReferenceModalOpen(false)}>닫기</ModalSecondaryButton>}
        >
          <div className={styles.documentList}>
            {documents.length === 0 ? (
              <div className={styles.docItem}>
                준비 완료된 문서가 없습니다. 파일을 업로드하고 학습이 끝나면 답변에 사용됩니다.
              </div>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className={styles.docItem}>
                  {doc.title} · {getDisplayLabel(doc.status)}
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function AIChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>로딩 중...</div>}>
      <AIChatContent />
    </Suspense>
  );
}
