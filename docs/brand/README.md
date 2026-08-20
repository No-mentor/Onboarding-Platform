# Brand — 사수없음 (No Mentor)

팀 **사수없음** / 제품 **OnboardOS (온보딩)** 로고 에셋입니다.

## 컨셉

| 요소 | 의미 |
|------|------|
| 상승 경로 + 스텝 노드 | 신입이 **스스로** 온보딩 단계를 밟아 감 |
| 사람(멘토) 실루엣 없음 | **사수 없이도** 길을 찾을 수 있음 |
| 끝점 스파크 | AI가 질문 전에 길을 비춰 주는 **Proactive** 가이드 |
| 컬러 | PRD 톤 — `#1B3A5F` / `#2E75B6` / `#4DA3FF` |

## 파일

| 파일 | 용도 |
|------|------|
| [`FE/public/logo.svg`](../../FE/public/logo.svg) | 가로형 풀 로고 (워드마크 + 아이콘) |
| [`FE/public/logo-icon.svg`](../../FE/public/logo-icon.svg) | 앱 아이콘 · 파비콘 · 아바타 |
| [`FE/public/logo-mono.svg`](../../FE/public/logo-mono.svg) | 단색 (`currentColor`) — 다크/라이트 배경 |

Next.js 등에서:

```tsx
// 예)
<img src="/logo.svg" alt="사수없음 OnboardOS" height={40} />
<img src="/logo-icon.svg" alt="사수없음" width={32} height={32} />
```

모노 로고는 부모 색을 따릅니다.

```html
<div style="color:#fff">
  <img src="/logo-mono.svg" alt="사수없음" />
</div>
```
