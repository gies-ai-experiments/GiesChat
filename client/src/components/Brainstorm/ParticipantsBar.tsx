import type { TRoomParticipant } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export default function ParticipantsBar({ participants }: { participants: TRoomParticipant[] }) {
  const localize = useLocalize();
  return (
    <div
      className="flex items-center gap-2 border-b border-border-light px-4 py-2"
      aria-label={localize('com_ui_brainstorm_members')}
    >
      {participants.map((participant) => (
        <div key={participant.userId} className="relative" title={participant.name}>
          <div className="flex size-8 items-center justify-center rounded-full bg-surface-tertiary text-xs font-semibold">
            {initials(participant.name)}
          </div>
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-surface-primary',
              participant.online === true ? 'bg-green-500' : 'bg-gray-400',
            )}
            aria-label={participant.online === true ? 'online' : 'away'}
          />
        </div>
      ))}
    </div>
  );
}
