/**
 * Global API Configuration (Single Source of Truth)
 *
 * 환경 변수 (NEXT_PUBLIC_API_URL) 하나만 설정하면
 * 프로젝트 내 모든 API 엔드포인트(인증, 문서, 대시보드, 체크리스트 등)가
 * 슬래시 중복 없이 자동으로 일괄 연결됩니다.
 */

function getCleanBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  const raw = (envUrl && envUrl.trim()) ? envUrl.trim() : 'http://localhost:8080';

  // 끝 슬래시 제거
  const noTrailingSlash = raw.replace(/\/+$/, '');
  // 사용자가 /api/v1 을 실수로 포함했을 경우 중복 방지를 위해 제거
  return noTrailingSlash.replace(/\/api\/v1\/?$/, '');
}

/** 순수 백엔드 서버 루트 도메인 (예: https://1-201-116-170.sslip.io 또는 http://localhost:8080) */
export const API_BASE_URL = getCleanBaseUrl();

/** 공통 v1 API 베이스 URL (예: https://1-201-116-170.sslip.io/api/v1) */
export const API_BASE = `${API_BASE_URL}/api/v1`;

/** 인증 전용 v1 API 엔드포인트 (예: https://1-201-116-170.sslip.io/api/v1/auth) */
export const AUTH_ENDPOINT = `${API_BASE_URL}/api/v1/auth`;
