import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Plus, Users } from 'lucide-react';
import { Button, Spinner } from '@librechat/client';
import { useGetRoomsQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import NewRoomDialog from './NewRoomDialog';
import { cn } from '~/utils';

export default function BrainstormPanel() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: rooms, isLoading } = useGetRoomsQuery();

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-primary-alt px-3 py-4 text-text-primary">
      <div className="flex items-center justify-between px-1 pb-3">
        <h2 className="text-lg font-semibold">{localize('com_ui_brainstorm')}</h2>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {localize('com_ui_brainstorm_new_room')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <Spinner className="size-5" aria-label="loading" />
        </div>
      )}

      {!isLoading && (rooms?.length ?? 0) === 0 && (
        <p className="px-1 text-sm text-text-secondary">{localize('com_ui_brainstorm_empty')}</p>
      )}

      <div className="flex flex-col gap-1 overflow-y-auto">
        {(rooms ?? []).map((room) => (
          <button
            key={room.roomId}
            type="button"
            onClick={() => navigate(`/brainstorm/${room.roomId}`)}
            className={cn(
              'flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-tertiary',
              room.archived ? 'opacity-60' : '',
            )}
          >
            <span className="min-w-0 truncate font-medium">{room.title}</span>
            <span className="flex shrink-0 items-center gap-1 pl-2 text-xs text-text-secondary">
              {room.archived && <Archive className="size-3" aria-hidden="true" />}
              <Users className="size-3" aria-hidden="true" />
              {room.participantCount}
            </span>
          </button>
        ))}
      </div>

      <NewRoomDialog open={dialogOpen} setOpen={setDialogOpen} />
    </div>
  );
}
