'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import styles from './modal.module.css';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  /** 모달 표시 여부. false 면 아무것도 렌더링하지 않는다. */
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  children: React.ReactNode;
  /** 하단 버튼 영역. 없으면 푸터를 그리지 않는다. */
  footer?: React.ReactNode;
  /** 배경 클릭으로 닫히지 않게 하려면 false (예: 입력 중 실수로 닫힘 방지) */
  closeOnBackdrop?: boolean;
}

/** 포커스를 받을 수 있는 요소들 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  // 모달을 열기 전에 포커스가 있던 요소. 닫을 때 여기로 되돌린다.
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Tab 이 모달 밖으로 새어 나가지 않도록 순환시킨다
      if (e.key !== 'Tab' || !modalRef.current) return;

      const items = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // 배경 스크롤 잠금 (스크롤바 폭만큼 보정해 레이아웃이 튀지 않게 한다)
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    document.addEventListener('keydown', handleKeyDown);

    // 모달이 열리면 첫 번째 요소로 포커스를 옮긴다
    const focusTimer = window.setTimeout(() => {
      const target = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      previouslyFocused.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`${styles.modal} ${styles[size]}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}

interface ModalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  /** true 면 스피너를 보여주고 클릭을 막는다 */
  loading?: boolean;
  disabled?: boolean;
}

function ModalButton({
  children,
  onClick,
  loading,
  disabled,
  className,
}: ModalButtonProps & { className: string }) {
  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <Loader2 size={15} className={styles.spinner} />}
      {children}
    </button>
  );
}

/** 모달 푸터에서 쓰는 공통 버튼들 */
export function ModalPrimaryButton(props: ModalButtonProps) {
  return <ModalButton {...props} className={styles.primaryBtn} />;
}

export function ModalSecondaryButton(props: ModalButtonProps) {
  return <ModalButton {...props} className={styles.secondaryBtn} />;
}

export function ModalDangerButton(props: ModalButtonProps) {
  return <ModalButton {...props} className={styles.dangerBtn} />;
}
