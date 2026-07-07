import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageInput, { splitAiMentions } from '../MessageInput';

const mockSendMessage = jest.fn();
const mockSendTyping = jest.fn();

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('~/data-provider', () => ({
  useSendRoomMessageMutation: () => ({ mutate: mockSendMessage, isLoading: false }),
  useRoomTypingMutation: () => ({ mutate: mockSendTyping }),
  useUploadFileMutation: () => ({ mutate: jest.fn(), isLoading: false }),
  useAttachRoomFileMutation: () => ({ mutate: jest.fn(), isLoading: false }),
  useCreateRoomPollMutation: () => ({ mutate: jest.fn(), isLoading: false }),
}));

jest.mock('@librechat/client', () => {
  const actual = jest.requireActual('@librechat/client');
  return { ...actual, useToastContext: () => ({ showToast: jest.fn() }) };
});

describe('MessageInput', () => {
  beforeEach(() => jest.clearAllMocks());

  const getTextarea = () => screen.getByLabelText('com_ui_brainstorm_input_placeholder');

  it('sends trimmed text on Enter and clears the input', () => {
    render(<MessageInput roomId="room-1" disabled={false} />);
    const textarea = getTextarea();
    fireEvent.change(textarea, { target: { value: '  hello room  ' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(mockSendMessage).toHaveBeenCalledWith('hello room');
    expect(textarea).toHaveValue('');
  });

  it('does not send empty text', () => {
    render(<MessageInput roomId="room-1" disabled={false} />);
    fireEvent.keyDown(getTextarea(), { key: 'Enter' });
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('keeps text on Shift+Enter', () => {
    render(<MessageInput roomId="room-1" disabled={false} />);
    const textarea = getTextarea();
    fireEvent.change(textarea, { target: { value: 'line one' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('disables input and send button when room is archived', () => {
    render(<MessageInput roomId="room-1" disabled={true} />);
    expect(getTextarea()).toBeDisabled();
    expect(screen.getByLabelText('com_ui_brainstorm_send')).toBeDisabled();
  });

  it('throttles typing pings while typing', () => {
    render(<MessageInput roomId="room-1" disabled={false} />);
    const textarea = getTextarea();
    fireEvent.change(textarea, { target: { value: 'a' } });
    fireEvent.change(textarea, { target: { value: 'ab' } });
    fireEvent.change(textarea, { target: { value: 'abc' } });
    expect(mockSendTyping).toHaveBeenCalledTimes(1);
  });

  it('shows the AI pill and highlights the mention when @ai is typed', () => {
    render(<MessageInput roomId="room-1" disabled={false} />);
    fireEvent.change(getTextarea(), { target: { value: 'hey @ai what do you think' } });
    expect(screen.getByRole('status')).toHaveTextContent('com_ui_brainstorm_ai_will_respond');
    fireEvent.change(getTextarea(), { target: { value: 'hey everyone' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('splitAiMentions', () => {
  it('isolates @ai mentions with original casing', () => {
    expect(splitAiMentions('hey @AI go')).toEqual([
      { text: 'hey ', mention: false },
      { text: '@AI', mention: true },
      { text: ' go', mention: false },
    ]);
  });

  it('matches at start of text and multiple mentions', () => {
    expect(splitAiMentions('@ai and @ai')).toEqual([
      { text: '@ai', mention: true },
      { text: ' and ', mention: false },
      { text: '@ai', mention: true },
    ]);
  });

  it('ignores emails and non-mentions', () => {
    expect(splitAiMentions('mail me@ai.com or @aid')).toEqual([
      { text: 'mail me@ai.com or @aid', mention: false },
    ]);
  });
});
