'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { createWorkspace, WorkspaceError } from '@/lib/api';
import { saveWorkspaceId } from '@/lib/storage';
import { slugify, validateSlug } from '@/lib/slug';
import styles from './workspace-create.module.css';

export default function WorkspaceCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  // 사용자가 주소를 직접 건드린 뒤에는 이름을 바꿔도 덮어쓰지 않는다
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
    setErrors(prev => {
      const next = { ...prev };
      delete next.name;
      delete next.form;
      return next;
    });
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(value.toLowerCase());
    setErrors(prev => {
      const next = { ...prev };
      delete next.slug;
      delete next.form;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    const newErrors: Record<string, string> = {};

    if (!trimmedName) {
      newErrors.name = '업무 공간 이름을 입력해 주세요.';
    } else if (trimmedName.length > 200) {
      newErrors.name = '이름은 200자 이하여야 합니다.';
    }

    const slugError = validateSlug(trimmedSlug);
    if (slugError) {
      newErrors.slug = slugError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const workspace = await createWorkspace(trimmedName, trimmedSlug);
      // 저장하지 않으면 대시보드가 다시 워크스페이스 없는 상태로 들어간다
      saveWorkspaceId(workspace.id);
      showToast('업무 공간이 만들어졌습니다.', 'success');
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof WorkspaceError && error.isConflict()) {
        setErrors({ slug: '이미 사용 중인 주소입니다. 다른 주소를 입력해 주세요.' });
      } else {
        const message = error instanceof Error ? error.message : '업무 공간 생성에 실패했습니다.';
        setErrors({ form: message });
        showToast(message, 'error');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Image src="/logo.png" alt="MenTalk Logo" width={28} height={28} />
          <span className={styles.brandName}>MenTalk</span>
        </div>

        <form onSubmit={handleSubmit}>
          <h1 className="title">새 업무 공간 만들기</h1>
          <p className="subtitle">
            업무 공간을 만들면 30일 인수인계 계획과 오늘 할 일이 자동으로 준비됩니다.
            만든 사람은 관리자(OWNER)가 됩니다.
          </p>

          {errors.form && <div className={styles.formError}>{errors.form}</div>}

          <div className={`field ${errors.name ? 'invalid' : ''}`} style={{ marginTop: '28px' }}>
            <label htmlFor="ws-name">업무 공간 이름</label>
            <div className="control">
              <input
                id="ws-name"
                type="text"
                placeholder="예: 마케팅팀"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>
            <p className="hint">팀이나 조직 이름을 그대로 쓰면 알아보기 쉬워요.</p>
            <p className="error">{errors.name}</p>
          </div>

          <div className={`field ${errors.slug ? `invalid ${styles.invalid}` : ''}`}>
            <label htmlFor="ws-slug">주소</label>
            <div className={styles.slugControl}>
              <span className={styles.slugPrefix}>onboardos.com/</span>
              <input
                id="ws-slug"
                type="text"
                placeholder="marketing-team"
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {errors.slug ? (
              <p className={styles.slugError}>{errors.slug}</p>
            ) : (
              <p className="hint">
                영문 소문자, 숫자, 하이픈(-)만 쓸 수 있어요. 한글 이름은 주소를 직접 입력해 주세요.
              </p>
            )}
          </div>

          <div className={styles.actions}>
            <button className="submit" type="submit" disabled={isLoading}>
              {isLoading ? '만드는 중...' : '업무 공간 만들기'}
            </button>
          </div>

          <div className="notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>초대를 받으셨다면 새로 만들지 마시고 초대 메일의 링크로 참여해 주세요.</span>
          </div>

          <p className={styles.back}>
            <Link href="/dashboard">돌아가기</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
