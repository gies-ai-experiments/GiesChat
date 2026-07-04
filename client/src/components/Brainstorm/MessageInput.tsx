import { useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button, TextareaAutosize } from '@librechat/client';
import { useLocalize } from '~/hooks';
import {
  useSendRoomMessageMutation,
  useCreateRoomPollMutation,
  useRoomTypingMutation,
} from '~/data-provider';
import AttachFileButton from './AttachFileButton';

export const parsePollCommand = (text: string): { question: string; options: string[] } | null => {
  if (!text.toLowerCase().startsWith('/poll ')) {
    return null;
  }
  const [question, ...options] = text
    .slice(6)
    .split('|')
    .map((part) => part.trim());
  return { question: question ?? '', options };
};

const MESSAGE_CAP = 8000;
const TYPING_THROTTLE_MS = 2000;

export default function MessageInput({
  roomId,
  disabled,
}: {
  roomId: string;
  disabled: boolean;
}) {
  const localize = useLocalize();
  const [text, setText] = useState('');
  const lastTypingAt = useRef(0);
  const sendMessage = useSendRoomMessageMutation(roomId);
  const createPoll = useCreateRoomPollMutation(roomId);
  const sendTyping = useRoomTypingMutation(roomId);

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || trimmed.length > MESSAGE_CAP || sendMessage.isLoading) {
      return;
    }
    const poll = parsePollCommand(trimmed);
    if (poll) {
      createPoll.mutate(poll);
    } else {
      sendMessage.mutate(trimmed);
    }
    setText('');
  };

  const onChange = (value: string) => {
    setText(value);
    const now = Date.now();
    if (!disabled && now - lastTypingAt.current >= TYPING_THROTTLE_MS) {
      lastTypingAt.current = now;
      sendTyping.mutate();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-border-light px-4 py-3">
      <AttachFileButton roomId={roomId} disabled={disabled} />
      <TextareaAutosize
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={disabled}
        maxLength={MESSAGE_CAP}
        maxRows={6}
        placeholder={localize('com_ui_brainstorm_input_placeholder')}
        aria-label={localize('com_ui_brainstorm_input_placeholder')}
        className="flex-1 resize-none rounded-xl border border-border-light bg-surface-primary px-3 py-2 text-sm focus:outline-none"
      />
      <Button
        variant="submit"
        size="icon"
        onClick={submit}
        disabled={disabled || text.trim().length === 0}
        aria-label={localize('com_ui_brainstorm_send')}
      >
        <SendHorizontal className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
