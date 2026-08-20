/**
 * 워크스페이스 이름에서 slug 후보를 만든다.
 *
 * 서버 규칙: ^[a-z0-9]+(?:-[a-z0-9]+)*$ (2~80자)
 * 한글 이름은 살릴 수 있는 영문/숫자가 없어 빈 문자열이 나올 수 있고,
 * 그때는 사용자가 직접 입력하도록 둔다.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 서버 규칙에 맞는지 검사하고, 어긋나면 사용자용 메시지를 돌려준다 */
export function validateSlug(slug: string): string | null {
  if (!slug) return '주소를 입력해 주세요.';
  if (slug.length < 2) return '주소는 2자 이상이어야 합니다.';
  if (slug.length > 80) return '주소는 80자 이하여야 합니다.';
  if (!SLUG_PATTERN.test(slug)) {
    return '영문 소문자, 숫자, 하이픈(-)만 쓸 수 있어요. 하이픈으로 시작하거나 끝날 수 없습니다.';
  }
  return null;
}
