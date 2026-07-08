import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import type { TRoomMessage } from 'librechat-data-provider';
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import { getMessageTimestamp } from '~/utils/messages';
import AppCard from './AppCard';

const AVATAR_COLORS = ['#13294B', '#2E5A88', '#3D7A6B', '#7A4E9E', '#8A5A2B', '#4B5563'];

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

// ponytail: cheap deterministic tint so speakers are distinguishable; swap for real avatar images if ever needed
const avatarColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const humanBubble =
  'w-full rounded-2xl border border-[var(--illini-blue-border)] border-l-4 border-l-[var(--illini-orange)] bg-gradient-to-br from-[var(--illini-blue)] to-[#1d3a65] px-3.5 py-3 text-white shadow-[0_10px_24px_rgba(19,41,75,0.14)] dark:border-[rgba(255,95,5,0.45)] dark:from-[#13294b] dark:to-[#0d1d35] dark:shadow-[0_12px_28px_rgba(0,0,0,0.35)]';

export default function MessageList({ messages }: { messages: TRoomMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex w-full flex-col gap-5 pb-3" role="log" aria-live="polite">
      {messages.map((message) => {
        if (message.kind === 'system') {
          return (
            <div
              key={message.messageId}
              role="status"
              className="my-2.5 border-y border-border-light px-3 py-1 text-center text-[13px] italic text-text-secondary"
            >
              {message.text}
            </div>
          );
        }
        if (message.kind === 'app') {
          return <AppCard key={message.messageId} message={message} />;
        }
        const isAi = message.kind === 'ai';
        const timestamp = getMessageTimestamp(message.createdAt);
        return (
          <div key={message.messageId} className="flex gap-3">
            <div className="flex-shrink-0">
              {isAi ? (
                <span className="flex size-8 items-center justify-center rounded-full bg-[var(--illini-orange)] text-white">
                  <Sparkles className="size-4" aria-hidden="true" />
                </span>
              ) : (
                <span
                  className="flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: avatarColor(message.authorId) }}
                >
                  {initialsOf(message.authorName)}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="flex select-none items-baseline gap-2 text-sm font-semibold text-text-primary">
                {message.authorName}
                {timestamp != null && (
                  <time
                    dateTime={timestamp.iso}
                    title={timestamp.absolute}
                    className="text-xs font-normal text-text-secondary"
                  >
                    {timestamp.relative}
                  </time>
                )}
              </h2>
              <div className="mt-1.5 min-w-0">
                {isAi ? (
                  <div className="border-l-[3px] border-[var(--illini-orange)] pl-3.5 text-sm text-text-primary">
                    <MarkdownLite content={message.text} />
                  </div>
                ) : (
                  <div className={humanBubble}>
                    <span className="whitespace-pre-wrap break-words text-sm">{message.text}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
