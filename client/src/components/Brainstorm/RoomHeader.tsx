import { useState } from 'react';
import { Archive, Copy, CopyCheck } from 'lucide-react';
import { Button, useToastContext } from '@librechat/client';
import type { TRoom } from 'librechat-data-provider';
import { useCopyToClipboard, useLocalize } from '~/hooks';
import { useArchiveRoomMutation } from '~/data-provider';
import { NotificationSeverity } from '~/common';

export default function RoomHeader({ room, isOwner }: { room: TRoom; isOwner: boolean }) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [isCopying, setIsCopying] = useState(false);
  const inviteUrl = `${window.location.origin}/brainstorm/${room.roomId}`;
  const copyInvite = useCopyToClipboard({ text: inviteUrl });
  const archiveRoom = useArchiveRoomMutation(room.roomId);

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border-light px-4 py-3">
      <h1 className="min-w-0 truncate text-lg font-semibold">{room.title}</h1>
      <div className="flex items-center gap-2">
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
            onClick={() =>
              archiveRoom.mutate(undefined, {
                onError: () =>
                  showToast({
                    message: localize('com_ui_brainstorm_error'),
                    severity: NotificationSeverity.ERROR,
                    showIcon: true,
                  }),
              })
            }
          >
            <Archive className="size-4" aria-hidden="true" />
            {localize('com_ui_brainstorm_archive')}
          </Button>
        )}
      </div>
    </div>
  );
}
