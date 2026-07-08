import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Copy, CopyCheck, Hammer, Sparkles } from 'lucide-react';
import { Spinner, useToastContext } from '@librechat/client';
import type { TRoom } from 'librechat-data-provider';
import BuildAppDialog from './BuildAppDialog';
import { useCopyToClipboard, useLocalize } from '~/hooks';
import { useArchiveRoomMutation, useSummarizeRoomMutation } from '~/data-provider';
import { NotificationSeverity } from '~/common';
import { cn } from '~/utils';

const secondaryBtn =
  'flex items-center gap-2 rounded-lg border border-border-light bg-surface-primary px-3.5 py-2 text-[13px] font-semibold text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-60';

export default function RoomHeader({ room, isOwner }: { room: TRoom; isOwner: boolean }) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [buildOpen, setBuildOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const inviteUrl = `${window.location.origin}/brainstorm/${room.roomId}`;
  const copyInvite = useCopyToClipboard({ text: inviteUrl });
  const archiveRoom = useArchiveRoomMutation();
  const summarize = useSummarizeRoomMutation(room.roomId);

  const showError = () =>
    showToast({
      message: localize('com_ui_brainstorm_error'),
      severity: NotificationSeverity.ERROR,
      showIcon: true,
    });

  const onArchive = () => {
    if (!window.confirm(localize('com_ui_brainstorm_archive_confirm', { title: room.title }))) {
      return;
    }
    archiveRoom.mutate(room.roomId, { onError: showError });
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-b border-border-light bg-surface-primary px-4 py-3 text-text-primary sm:px-5">
      <div className="min-w-0">
        <Link
          to="/brainstorm"
          className="text-xs text-text-secondary hover:text-text-primary hover:underline"
        >
          ← {localize('com_ui_brainstorm_back_to_dashboard')}
        </Link>
        <div className="text-xs text-text-secondary">{localize('com_ui_brainstorm')}</div>
        <h1 className="min-w-0 truncate text-lg font-bold sm:text-xl">{room.title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={secondaryBtn}
          disabled={summarize.isLoading}
          onClick={() => summarize.mutate({ scope: 'room' }, { onError: showError })}
        >
          {summarize.isLoading ? (
            <Spinner className="size-4" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {localize('com_ui_brainstorm_summarize')}
        </button>
        {isOwner && !room.archived && (
          <button type="button" className={secondaryBtn} onClick={() => setBuildOpen(true)}>
            <Hammer className="size-4" aria-hidden="true" />
            {localize('com_ui_brainstorm_build_app')}
          </button>
        )}
        {isOwner && !room.archived && (
          <button
            type="button"
            className={secondaryBtn}
            disabled={archiveRoom.isLoading}
            onClick={onArchive}
          >
            <Archive className="size-4" aria-hidden="true" />
            {localize('com_ui_brainstorm_archive')}
          </button>
        )}
        <button
          type="button"
          disabled={isCopying}
          onClick={() => copyInvite(setIsCopying)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition-colors',
            isCopying ? 'bg-[#166534]' : 'bg-surface-submit hover:bg-surface-submit-hover',
          )}
        >
          {isCopying ? (
            <CopyCheck className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {localize('com_ui_brainstorm_copy_invite')}
        </button>
      </div>
      {isOwner && (
        <BuildAppDialog roomId={room.roomId} open={buildOpen} onClose={() => setBuildOpen(false)} />
      )}
    </header>
  );
}
