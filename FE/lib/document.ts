/**
 * 문서 API 의 예전 호출 형태(워크스페이스 ID 를 인자로 받는 방식) 호환 레이어.
 *
 * 구현은 lib/api.ts 하나만 쓴다. api.ts 는 워크스페이스를 localStorage 에서 읽으므로
 * 여기서 받은 workspaceId 는 "현재 워크스페이스와 같은지" 확인하는 용도로만 쓴다.
 */
import {
  deleteDocument as apiDeleteDocument,
  getDocumentDetail,
  getDocuments as apiGetDocuments,
  getMyProgress,
  reprocessDocument as apiReprocessDocument,
  uploadDocument as apiUploadDocument,
  type DocumentPageResponse,
  type DocumentResponse,
  type MyProgressResponse,
} from './api';
import { getWorkspaceId } from './storage';

// 문서 타입은 lib/api.ts 를 단일 출처로 쓴다 (서버 스펙과 1:1)
export type { DocumentResponse, DocumentStatus, DocumentPageResponse } from './api';

/** @deprecated lib/api.ts 의 DocumentPageResponse 를 쓰세요 */
export type DocumentListResponse = DocumentPageResponse;

/**
 * 넘겨받은 워크스페이스가 지금 선택된 워크스페이스와 다르면 막는다.
 * (서버 요청 헤더는 localStorage 값으로 나가므로 조용히 다른 곳을 건드리면 안 된다)
 */
function assertCurrentWorkspace(workspaceId: string): void {
  const current = getWorkspaceId();
  if (!current) throw new Error('인증 정보 없음');
  if (workspaceId && workspaceId !== current) {
    throw new Error('현재 선택된 워크스페이스가 아닙니다. 워크스페이스를 먼저 전환해 주세요.');
  }
}

export async function uploadDocument(
  workspaceId: string,
  file: File,
  title?: string
): Promise<DocumentResponse> {
  assertCurrentWorkspace(workspaceId);
  return apiUploadDocument({ file, title });
}

export async function getDocuments(
  workspaceId: string,
  page: number = 0,
  size: number = 20,
  status?: string
): Promise<DocumentListResponse> {
  assertCurrentWorkspace(workspaceId);
  return apiGetDocuments({
    page,
    size,
    status: status as DocumentResponse['status'] | undefined,
  });
}

export async function getDocument(
  workspaceId: string,
  documentId: string
): Promise<DocumentResponse> {
  assertCurrentWorkspace(workspaceId);
  return getDocumentDetail(documentId);
}

export async function reprocessDocument(
  workspaceId: string,
  documentId: string
): Promise<DocumentResponse> {
  assertCurrentWorkspace(workspaceId);
  return apiReprocessDocument(documentId);
}

export async function deleteDocument(workspaceId: string, documentId: string): Promise<void> {
  assertCurrentWorkspace(workspaceId);
  return apiDeleteDocument(documentId);
}

/** GET /progress/me */
export async function getProgressMe(workspaceId: string): Promise<MyProgressResponse> {
  assertCurrentWorkspace(workspaceId);
  return getMyProgress();
}
