import { BarChart2, Lock } from 'lucide-react';
import { Button } from '@librechat/client';
import type { TRoomPoll } from 'librechat-data-provider';
import { useVoteRoomPollMutation, useCloseRoomPollMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export default function PollCard({
  roomId,
  poll,
  currentUserId,
  isOwner,
}: {
  roomId: string;
  poll: TRoomPoll;
  currentUserId: string;
  isOwner: boolean;
}) {
  const localize = useLocalize();
  const vote = useVoteRoomPollMutation(roomId);
  const close = useCloseRoomPollMutation(roomId);
  const isOpen = poll.status === 'open';
  const canClose = isOpen && (isOwner || poll.createdBy === currentUserId);
  const totalVotes = poll.tally?.reduce((sum, n) => sum + n, 0) ?? poll.voteCount;

  const maxCount = Math.max(...(poll.tally ?? [0]), 1);

  return (
    <div className="my-3 rounded-[10px] border border-border-light bg-surface-primary p-3.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <BarChart2 className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{poll.question}</span>
        {!isOpen && <Lock className="size-3.5 text-text-secondary" aria-hidden="true" />}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {poll.options.map((option, idx) => {
          const isMyVote = poll.myVote === idx;
          const count = poll.tally?.[idx];
          const isWinner = !isOpen && count !== undefined && count === maxCount && count > 0;
          return (
            <button
              key={idx}
              type="button"
              disabled={!isOpen || vote.isLoading}
              onClick={() => vote.mutate({ pollId: poll.pollId, optionIndex: idx })}
              className={cn(
                'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                isMyVote
                  ? 'border-border-light bg-surface-active font-medium'
                  : 'border-border-light bg-surface-primary',
                isOpen ? 'hover:bg-surface-hover' : 'cursor-default',
                isWinner && 'font-bold',
              )}
            >
              <span className="flex items-center justify-between">
                <span className="min-w-0 truncate">{option}</span>
                {count !== undefined && (
                  <span className="shrink-0 pl-2 text-xs tabular-nums text-text-secondary">
                    {count}
                  </span>
                )}
              </span>
              {!isOpen && count !== undefined && (
                <span
                  className="mt-1.5 block h-1 overflow-hidden rounded-sm bg-surface-tertiary"
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      'block h-full rounded-sm',
                      isWinner ? 'bg-text-secondary' : 'bg-border-medium',
                    )}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
        <span>
          {isOpen
            ? localize('com_ui_brainstorm_poll_hidden', { count: poll.voteCount })
            : localize('com_ui_brainstorm_poll_closed', { count: totalVotes })}
        </span>
        {canClose && (
          <Button
            variant="outline"
            size="sm"
            disabled={close.isLoading}
            onClick={() => close.mutate(poll.pollId)}
          >
            {localize('com_ui_brainstorm_poll_close')}
          </Button>
        )}
      </div>
    </div>
  );
}
