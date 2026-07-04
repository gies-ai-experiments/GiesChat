import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageInput from '../MessageInput';

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
}));

jest.mock('@librechat/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
});
