import { getAuthToken } from './storage';
import type { DocumentResponse } from './api';

const API_BASE = 'http://localhost:8080/api/v1';

// 문서 타입은 lib/api.ts 를 단일 출처로 쓴다 (서버 스펙과 1:1)
export type { DocumentResponse, DocumentStatus } from './api';

import type { DocumentPageResponse } from './api';

/** @deprecated lib/api.ts 의 DocumentPageResponse 를 쓰세요 */
export type DocumentListResponse = DocumentPageResponse;

export async function uploadDocument(
  workspaceId: string,
  file: File,
  title?: string
): Promise<DocumentResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 토큰이 없습니다');

  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);

  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': workspaceId,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '파일 업로드 실패');
  }

  return response.json();
}

export async function getDocuments(
  workspaceId: string,
  page: number = 0,
  size: number = 20,
  status?: string
): Promise<DocumentListResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 토큰이 없습니다');

  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });
  if (status) params.append('status', status);

  const response = await fetch(`${API_BASE}/documents?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': workspaceId,
    },
  });

  if (!response.ok) {
    throw new Error('파일 목록 조회 실패');
  }

  return response.json();
}

export async function getProgressMe(workspaceId: string) {
  const token = getAuthToken();
  if (!token) throw new Error('인증 토큰이 없습니다');

  const response = await fetch(`${API_BASE}/progress/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': workspaceId,
    },
  });

  if (!response.ok) {
    throw new Error('진행 현황 조회 실패');
  }

  return response.json();
}

export async function getDocument(
  workspaceId: string,
  documentId: string
): Promise<DocumentResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 토큰이 없습니다');

  const response = await fetch(`${API_BASE}/documents/${documentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': workspaceId,
    },
  });

  if (!response.ok) {
    throw new Error('파일 조회 실패');
  }

  return response.json();
}

export async function reprocessDocument(
  workspaceId: string,
  documentId: string
): Promise<DocumentResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 토큰이 없습니다');

  const response = await fetch(`${API_BASE}/documents/${documentId}/reprocess`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': workspaceId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '파일 재처리 실패');
  }

  return response.json();
}

export async function deleteDocument(
  workspaceId: string,
  documentId: string
): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error('인증 토큰이 없습니다');

  const response = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': workspaceId,
    },
  });

  if (!response.ok) {
    throw new Error('파일 삭제 실패');
  }
}
