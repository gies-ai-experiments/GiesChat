import { useEffect, useRef } from 'react';
import type { TRoomMessage } from 'librechat-data-provider';
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import { getMessageTimestamp } from '~/utils/messages';
import { cn } from '~/utils';

export default function MessageList({ messages }: { messages: TRoomMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="pb-3" role="log" aria-live="polite">
      {messages.map((message) => {
        if (message.kind === 'system') {
          return (
            <div
              key={message.messageId}
              role="status"
              className="my-2.5 border-y border-[#E5E7EB] px-3 py-1 text-center text-[13px] italic text-[#6B7280] dark:border-border-light dark:text-text-secondary"
            >
              {message.text}
            </div>
          );
        }
        const isAi = message.kind === 'ai';
        const timestamp = getMessageTimestamp(message.createdAt);
        return (
          <div
            key={message.messageId}
            className={cn(
              'my-2 rounded-lg border border-l-[3px] border-[#E5E7EB] bg-white px-3 py-2.5 dark:border-border-light dark:bg-surface-primary',
              isAi ? 'border-l-[#FF5F05]' : 'border-l-[#13294B] dark:border-l-border-heavy',
            )}
          >
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'rounded px-[9px] py-0.5 text-[13px] font-bold text-white',
                  isAi ? 'bg-[#FF5F05]' : 'bg-[#13294B] dark:bg-surface-tertiary',
                )}
              >
                {message.authorName}
              </span>
              {timestamp != null && (
                <time
                  dateTime={timestamp.iso}
                  title={timestamp.absolute}
                  className="text-xs text-[#6B7280] dark:text-text-secondary"
                >
                  {timestamp.relative}
                </time>
              )}
            </div>
            <div className="mt-1.5 text-sm">
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
