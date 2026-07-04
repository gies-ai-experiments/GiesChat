import type { TRoomTypingEvent } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';

export default function TypingIndicator({
  typingUsers,
  currentUserId,
}: {
  typingUsers: TRoomTypingEvent[];
  currentUserId: string;
}) {
  const localize = useLocalize();
  const others = typingUsers.filter((t) => t.userId !== currentUserId);
  if (others.length === 0) {
    return <div className="h-5" aria-hidden="true" />;
  }
  const text =
    others.length === 1
      ? localize('com_ui_brainstorm_typing', { name: others[0].name })
      : localize('com_ui_brainstorm_typing_many');
  return <div className="h-5 px-4 text-xs italic text-text-secondary">{text}</div>;
}
