import { useState } from 'react';
import { Archive, Copy, CopyCheck, Sparkles } from 'lucide-react';
import { Button, Spinner, useToastContext } from '@librechat/client';
import type { TRoom } from 'librechat-data-provider';
import { useCopyToClipboard, useLocalize } from '~/hooks';
import { useArchiveRoomMutation, useSummarizeRoomMutation } from '~/data-provider';
import { NotificationSeverity } from '~/common';

export default function RoomHeader({ room, isOwner }: { room: TRoom; isOwner: boolean }) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [isCopying, setIsCopying] = useState(false);
  const inviteUrl = `${window.location.origin}/brainstorm/${room.roomId}`;
  const copyInvite = useCopyToClipboard({ text: inviteUrl });
  const archiveRoom = useArchiveRoomMutation(room.roomId);
  const summarize = useSummarizeRoomMutation(room.roomId);

  const showError = () =>
    showToast({
      message: localize('com_ui_brainstorm_error'),
      severity: NotificationSeverity.ERROR,
      showIcon: true,
    });

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border-light px-4 py-3">
      <h1 className="min-w-0 truncate text-lg font-semibold">{room.title}</h1>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={summarize.isLoading}
          onClick={() =>
            summarize.mutate({ scope: 'room' }, { onError: showError })
          }
        >
          {summarize.isLoading ? (
            <Spinner className="size-4" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {localize('com_ui_brainstorm_summarize')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isCopying}
          onClick={() => copyInvite(setIsCopying)}
        >
          {isCopying ? (
            <CopyCheck className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {localize('com_ui_brainstorm_copy_invite')}
        </Button>
        {isOwner && !room.archived && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={archiveRoom.isLoading}
            onClick={() => archiveRoom.mutate(undefined, { onError: showError })}
          >
            <Archive className="size-4" aria-hidden="true" />
            {localize('com_ui_brainstorm_archive')}
          </Button>
        )}
      </div>
    </div>
  );
}
