import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { Modal } from './modal';

afterEach(cleanup);

/**
 * 실제 버그 재현 조건과 같은 구조: 부모가 입력 state 를 갖고, onClose 를 인라인 함수로 넘긴다.
 * (템플릿 생성 모달 등 이 저장소의 실제 사용 패턴과 동일)
 */
function TemplateCreateLikeModal() {
  const [open, setOpen] = useState(true);
  const [description, setDescription] = useState('');

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="템플릿 생성">
      <input
        aria-label="설명"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
    </Modal>
  );
}

describe('Modal 포커스 동작', () => {
  it('입력 필드에 타이핑해도 포커스가 닫기 버튼으로 튀지 않는다', async () => {
    const user = userEvent.setup();
    render(<TemplateCreateLikeModal />);

    const input = await screen.findByLabelText('설명');
    // 모달이 열리면 입력 요소로 초기 포커스가 가야 한다 (닫기 버튼이 아니라)
    expect(document.activeElement).toBe(input);

    await user.type(input, '한 글자');

    expect((input as HTMLInputElement).value).toBe('한 글자');
    // 부모가 매 키 입력마다 onClose 인라인 함수를 새로 만들어 리렌더되어도
    // 포커스는 계속 입력 요소에 남아 있어야 한다 (닫기 버튼으로 이동하면 안 된다).
    expect(document.activeElement).toBe(input);
  });

  it('입력 요소가 없으면 첫 번째로 포커스 가능한 요소(대개 닫기 버튼)로 초기 포커스를 옮긴다', async () => {
    render(
      <Modal open onClose={() => {}} title="확인">
        <p>정말 삭제하시겠습니까?</p>
      </Modal>
    );

    const closeBtn = await screen.findByRole('button', { name: '닫기' });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('ESC 를 누르면 onClose 가 호출된다', async () => {
    const user = userEvent.setup();
    let closed = false;

    render(
      <Modal open onClose={() => { closed = true; }} title="확인">
        <input aria-label="이름" />
      </Modal>
    );

    await screen.findByLabelText('이름');
    await user.keyboard('{Escape}');

    expect(closed).toBe(true);
  });

  it('Tab 포커스 트랩: 마지막 요소에서 Tab 을 누르면 첫 요소로 순환한다', async () => {
    const user = userEvent.setup();

    render(
      <Modal
        open
        onClose={() => {}}
        title="확인"
        footer={<button>확인</button>}
      >
        <input aria-label="이름" />
      </Modal>
    );

    const input = await screen.findByLabelText('이름');
    const confirmBtn = screen.getByRole('button', { name: '확인' });

    confirmBtn.focus();
    expect(document.activeElement).toBe(confirmBtn);

    await user.tab();
    // 닫기 버튼 → 입력 → 확인 순으로 갔다가, 확인에서 다시 Tab 하면 첫 요소(닫기 버튼)로 돌아간다
    const closeBtn = screen.getByRole('button', { name: '닫기' });
    expect(document.activeElement).toBe(closeBtn);
    void input;
  });
});
