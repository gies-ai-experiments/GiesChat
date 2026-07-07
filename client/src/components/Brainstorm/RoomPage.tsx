import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '@librechat/client';
import { useLocalize, useAuthContext } from '~/hooks';
import { useRoomStream, useJoinRoomMutation, useGetRoomSnapshotQuery } from '~/data-provider';
import ParticipantsBar, { MembersList } from './ParticipantsBar';
import FilesRow, { FilesPanel } from './FilesRow';
import TypingIndicator from './TypingIndicator';
import MessageInput from './MessageInput';
import CatchUpChip from './CatchUpChip';
import MessageList from './MessageList';
import RoomHeader from './RoomHeader';
import PollCard from './PollCard';

const GUIDANCE_PREVIEW_CHARS = 140;

function GuidanceCard({ text }: { text: string }) {
  const localize = useLocalize();
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.length > GUIDANCE_PREVIEW_CHARS;
  const shown = expanded || !needsToggle ? text : `${text.slice(0, GUIDANCE_PREVIEW_CHARS)}…`;

  return (
    <div className="mb-3 rounded-lg border border-dashed border-[#E5E7EB] bg-[#13294B]/[0.04] px-3 py-2.5 text-[13px] dark:border-border-medium dark:bg-surface-tertiary">
      <span className="font-semibold text-[#6B7280] dark:text-text-secondary">
        {localize('com_ui_brainstorm_ai_guidance')}
      </span>
      <p className="mt-1 whitespace-pre-wrap break-words text-text-primary">{shown}</p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-semibold text-[#13294B] hover:underline dark:text-text-primary"
        >
          {expanded
            ? localize('com_ui_brainstorm_show_less')
            : localize('com_ui_brainstorm_show_more')}
        </button>
      )}
    </div>
  );
}

export default function RoomPage() {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const { roomId = '' } = useParams();
  const joinRoom = useJoinRoomMutation();
  const joined = joinRoom.isSuccess;

  useEffect(() => {
    if (roomId !== '') {
      joinRoom.mutate(roomId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const {
    data: snapshot,
    isLoading,
    isError,
  } = useGetRoomSnapshotQuery(roomId, { enabled: joined });
  const typingUsers = useRoomStream(roomId, joined && snapshot != null);

  if (joinRoom.isError || isError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-text-secondary">
        {localize('com_ui_brainstorm_error')}
      </div>
    );
  }

  if (!joined || isLoading || snapshot == null) {
    return (
      <div className="flex h-full items-center justify-center" role="status" aria-label="loading">
        <Spinner className="size-6" />
      </div>
    );
  }

  const currentUserId = user?.id ?? '';
  const isOwner = snapshot.participants.some(
    (p) => p.userId === currentUserId && p.role === 'owner',
  );
  const contextText = snapshot.room.contextText ?? '';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#EEF1F6] text-text-primary dark:bg-surface-secondary">
      <RoomHeader room={snapshot.room} isOwner={isOwner} />
      {snapshot.room.archived && (
        <div className="border-b border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-center text-sm font-medium text-[#991B1B]">
          {localize('com_ui_brainstorm_archived_banner')}
        </div>
      )}
      <div className="md:hidden">
        <ParticipantsBar participants={snapshot.participants} />
        <FilesRow roomId={roomId} files={snapshot.files} isOwner={isOwner} />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-2 md:grid-cols-[220px_minmax(0,1fr)_280px] md:p-4">
        <aside className="hidden min-h-0 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white p-4 dark:border-border-light dark:bg-surface-primary md:block">
          <MembersList participants={snapshot.participants} />
        </aside>

        <section className="grid min-h-0 grid-rows-[1fr_auto] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white dark:border-border-light dark:bg-surface-primary">
          <div className="flex min-h-0 flex-col overflow-y-auto px-3 pt-3">
            {contextText !== '' && <GuidanceCard text={contextText} />}
            <CatchUpChip roomId={roomId} unreadCount={snapshot.unreadCount} />
            {snapshot.polls.map((poll) => (
              <PollCard
                key={poll.pollId}
                roomId={roomId}
                poll={poll}
                currentUserId={currentUserId}
                isOwner={isOwner}
              />
            ))}
            <MessageList messages={snapshot.messages} />
          </div>
          <div>
            <TypingIndicator typingUsers={typingUsers} currentUserId={currentUserId} />
            <MessageInput roomId={roomId} disabled={snapshot.room.archived} />
          </div>
        </section>

        <aside className="hidden min-h-0 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white p-4 dark:border-border-light dark:bg-surface-primary md:block">
          <FilesPanel roomId={roomId} files={snapshot.files} isOwner={isOwner} />
        </aside>
      </div>
    </div>
  );
}
