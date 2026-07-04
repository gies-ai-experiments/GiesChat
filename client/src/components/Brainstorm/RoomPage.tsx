import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '@librechat/client';
import { useLocalize, useAuthContext } from '~/hooks';
import { useRoomStream, useJoinRoomMutation, useGetRoomSnapshotQuery } from '~/data-provider';
import ParticipantsBar from './ParticipantsBar';
import TypingIndicator from './TypingIndicator';
import MessageInput from './MessageInput';
import CatchUpChip from './CatchUpChip';
import MessageList from './MessageList';
import RoomHeader from './RoomHeader';
import FilesRow from './FilesRow';
import PollCard from './PollCard';

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

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-primary-alt text-text-primary">
      <RoomHeader room={snapshot.room} isOwner={isOwner} />
      <ParticipantsBar participants={snapshot.participants} />
      <FilesRow roomId={roomId} files={snapshot.files} isOwner={isOwner} />
      {snapshot.room.archived && (
        <div className="bg-surface-tertiary px-4 py-2 text-center text-sm text-text-secondary">
          {localize('com_ui_brainstorm_archived_banner')}
        </div>
      )}
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
      <MessageList messages={snapshot.messages} currentUserId={currentUserId} />
      <TypingIndicator typingUsers={typingUsers} currentUserId={currentUserId} />
      <MessageInput roomId={roomId} disabled={snapshot.room.archived} />
    </div>
  );
}
