import { useEffect, useRef } from 'react';
import type { TRoomMessage } from 'librechat-data-provider';
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import { cn } from '~/utils';

export default function MessageList({
  messages,
  currentUserId,
}: {
  messages: TRoomMessage[];
  currentUserId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" role="log" aria-live="polite">
      {messages.map((message) => {
        if (message.kind === 'system') {
          return (
            <div
              key={message.messageId}
              className="text-center text-xs text-text-secondary"
            >
              {message.text}
            </div>
          );
        }
        const isMine = message.authorId === currentUserId;
        const isAi = message.kind === 'ai';
        return (
          <div
            key={message.messageId}
            className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}
          >
            <span className="px-1 text-xs font-medium text-text-secondary">
              {message.authorName}
            </span>
            <div
              className={cn(
                'mt-1 max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                isAi
                  ? 'border border-border-light bg-surface-primary'
                  : isMine
                    ? 'bg-surface-submit text-white'
                    : 'bg-surface-tertiary',
              )}
            >
              {isAi ? (
                <MarkdownLite content={message.text} />
              ) : (
                <span className="whitespace-pre-wrap break-words">{message.text}</span>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
