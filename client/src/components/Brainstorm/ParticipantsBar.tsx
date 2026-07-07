import type { TRoomParticipant } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

function PresenceDot({ online }: { online?: boolean }) {
  return (
    <span
      className={cn(
        'size-2 shrink-0 rounded-full',
        online === true ? 'bg-[#22C55E]' : 'border border-[#E5E7EB] dark:border-border-medium',
      )}
      aria-label={online === true ? 'online' : 'away'}
    />
  );
}

export function MembersList({ participants }: { participants: TRoomParticipant[] }) {
  const localize = useLocalize();
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.05em] text-[#6B7280] dark:text-text-secondary">
        {localize('com_ui_brainstorm_members')}
      </h2>
      <ul className="mt-2">
        {participants.map((participant) => (
          <li key={participant.userId} className="flex items-center gap-2 py-1.5">
            <PresenceDot online={participant.online} />
            <span className="min-w-0 truncate text-sm">{participant.name}</span>
            {participant.role === 'owner' && (
              <span className="ml-auto shrink-0 rounded-[10px] bg-[#DCFCE7] px-[7px] py-px text-[10px] font-bold uppercase text-[#166534]">
                {localize('com_ui_brainstorm_owner')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ParticipantsBar({ participants }: { participants: TRoomParticipant[] }) {
  const localize = useLocalize();
  return (
    <div
      className="flex items-center gap-2 border-b border-[#E5E7EB] bg-white px-4 py-2 dark:border-border-light dark:bg-surface-primary"
      aria-label={localize('com_ui_brainstorm_members')}
    >
      {participants.map((participant) => (
        <div key={participant.userId} className="relative" title={participant.name}>
          <div className="flex size-8 items-center justify-center rounded-full bg-[#13294B] text-xs font-semibold text-white dark:bg-surface-tertiary dark:text-text-primary">
            {initials(participant.name)}
          </div>
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-white dark:border-surface-primary',
              participant.online === true ? 'bg-[#22C55E]' : 'bg-gray-400',
            )}
            aria-label={participant.online === true ? 'online' : 'away'}
          />
        </div>
      ))}
    </div>
  );
}
