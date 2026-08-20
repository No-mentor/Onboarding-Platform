'use client';

import React from 'react';
import styles from './markdown.module.css';

/**
 * AI 답변용 최소 마크다운 렌더러.
 *
 * 모델(gpt-4o-mini)이 실제로 내보내는 서식만 다룬다: 제목, 굵게/기울임, 인라인 코드,
 * 코드 블록, 순서/비순서 목록, 인용, 구분선, 링크, 파이프 표.
 * HTML 문자열을 주입하지 않고 React 엘리먼트만 만들기 때문에 XSS 위험이 없다.
 */

type Inline = React.ReactNode;

/** 코드 > 링크 > 굵게 > 기울임 순으로 먼저 잡는다 (굵게가 기울임보다 앞) */
const INLINE_PATTERN = new RegExp(
  [
    '(`[^`]+`)', // 인라인 코드
    '(\\[[^\\]\\n]+\\]\\((?:https?:\\/\\/|\\/)[^\\s)]+\\))', // 링크
    '(\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__)', // 굵게
    '(\\*[^*\\n]+\\*|_[^_\\n]+_)', // 기울임
  ].join('|'),
  'g'
);

function renderInline(text: string, keyPrefix: string): Inline[] {
  const nodes: Inline[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const key = `${keyPrefix}-i${index++}`;
    const [token] = match;

    if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className={styles.code}>
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((.+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        nodes.push(
          <a key={key} className={styles.link} href={href} target="_blank" rel="noreferrer noopener">
            {label}
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <strong key={key} className={styles.strong}>
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^>\s?(.*)$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*(\d+)[.)]\s+(.*)$/;
const TABLE_DIVIDER = /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/;

/**
 * 모델이 목록 항목 사이에 빈 줄을 넣는 경우가 많다.
 * 빈 줄을 건너뛴 다음 줄이 같은 종류의 항목이면 같은 목록으로 이어 붙인다.
 * 이어지지 않으면 -1 을 돌려주고 목록을 끝낸다.
 */
function continuesList(lines: string[], index: number, pattern: RegExp): number {
  let cursor = index;
  while (cursor < lines.length && !lines[cursor].trim()) cursor++;
  return cursor > index && cursor < lines.length && pattern.test(lines[cursor]) ? cursor : -1;
}

/** 파이프 표의 한 줄을 셀로 쪼갠다 */
function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * 모델이 목록을 줄바꿈 없이 한 줄로 뱉는 경우가 있다.
 * ("... 다음과 같습니다: 1. **개요**: ... 2. **분석 범위**: - 파일 분석: ...")
 * 그대로 두면 한 문단으로 뭉치므로, 번호/불릿 표시 앞에서 줄을 나눠 준다.
 *
 * 잘못 쪼개는 것을 막기 위해 조건을 좁게 둔다.
 *   - 이미 줄바꿈이 충분히 있으면 손대지 않는다
 *   - 표시가 2개 이상 있을 때만 나눈다 (소수점 "3.5" 한 번으로는 동작하지 않음)
 */
function normalize(input: string): string {
  const text = input.replace(/\r\n/g, '\n');
  if (text.split('\n').filter((line) => line.trim()).length > 2) return text;

  const numbered = /(?:^|\s)(\d{1,2})\.\s+(?=\S)/g;
  const bulleted = /\s+-\s+(?=\S)/g;
  const numberedCount = (text.match(numbered) ?? []).length;

  let result = text;
  if (numberedCount >= 2) {
    result = result.replace(numbered, (all, digits) => `\n${digits}. `);
    // 번호 목록 안에서 쓰인 "- 항목" 은 하위 불릿으로 본다
    result = result.replace(bulleted, '\n- ');
  }
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = normalize(text).split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 코드 블록
    if (line.trim().startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        body.push(lines[i]);
        i++;
      }
      i++; // 닫는 fence
      blocks.push(
        <pre key={`b${key++}`} className={styles.pre}>
          <code>{body.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // 빈 줄
    if (!line.trim()) {
      i++;
      continue;
    }

    // 구분선
    if (RULE.test(line)) {
      blocks.push(<hr key={`b${key++}`} className={styles.rule} />);
      i++;
      continue;
    }

    // 제목
    const heading = line.match(HEADING);
    if (heading) {
      const level = Math.min(heading[1].length, 6);
      const Tag = `h${level === 1 ? 3 : level === 2 ? 4 : 5}` as 'h3' | 'h4' | 'h5';
      blocks.push(
        <Tag key={`b${key++}`} className={styles.heading}>
          {renderInline(heading[2], `b${key}`)}
        </Tag>
      );
      i++;
      continue;
    }

    // 표 (머리글 + 구분선이 이어질 때만)
    if (line.includes('|') && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={`b${key++}`} className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {headers.map((cell, index) => (
                  <th key={index}>{renderInline(cell, `h${index}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{renderInline(cell, `c${rowIndex}-${cellIndex}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 인용
    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        body.push(lines[i].match(QUOTE)![1]);
        i++;
      }
      blocks.push(
        <blockquote key={`b${key++}`} className={styles.quote}>
          {renderInline(body.join(' '), `b${key}`)}
        </blockquote>
      );
      continue;
    }

    // 순서 있는 목록
    if (ORDERED.test(line)) {
      const items: string[] = [];
      const start = Number(line.match(ORDERED)![1]);
      while (i < lines.length) {
        if (ORDERED.test(lines[i])) {
          items.push(lines[i].match(ORDERED)![2]);
          i++;
          continue;
        }
        const next = continuesList(lines, i, ORDERED);
        if (next < 0) break;
        i = next;
      }
      blocks.push(
        <ol key={`b${key++}`} className={styles.list} start={start}>
          {items.map((item, index) => (
            <li key={index}>{renderInline(item, `o${key}-${index}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // 순서 없는 목록
    if (BULLET.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        if (BULLET.test(lines[i])) {
          items.push(lines[i].match(BULLET)![1]);
          i++;
          continue;
        }
        const next = continuesList(lines, i, BULLET);
        if (next < 0) break;
        i = next;
      }
      blocks.push(
        <ul key={`b${key++}`} className={styles.list}>
          {items.map((item, index) => (
            <li key={index}>{renderInline(item, `u${key}-${index}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // 문단 (빈 줄이나 다른 블록이 나올 때까지 이어 붙인다)
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !RULE.test(lines[i]) &&
      !HEADING.test(lines[i]) &&
      !QUOTE.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !ORDERED.test(lines[i]) &&
      !lines[i].trim().startsWith('```')
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={`b${key++}`} className={styles.paragraph}>
        {renderInline(paragraph.join(' '), `p${key}`)}
      </p>
    );
  }

  return <div className={className ? `${styles.root} ${className}` : styles.root}>{blocks}</div>;
}
