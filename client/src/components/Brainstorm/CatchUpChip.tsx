import { useState } from 'react';
import { History } from 'lucide-react';
import { Button, OGDialog, OGDialogTemplate, Spinner } from '@librechat/client';
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import { useSummarizeRoomMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

const CATCH_UP_THRESHOLD = 15;

export default function CatchUpChip({
  roomId,
  unreadCount,
}: {
  roomId: string;
  unreadCount: number;
}) {
  const localize = useLocalize();
  const [open, setOpen] = useState(false);
  const [recap, setRecap] = useState('');
  const summarize = useSummarizeRoomMutation(roomId);

  if (unreadCount < CATCH_UP_THRESHOLD) {
    return null;
  }

  const fetchRecap = () =>
    summarize.mutate(
      { scope: 'me' },
      {
        onSuccess: (result) => {
          setRecap(result.text ?? '');
          setOpen(true);
        },
      },
    );

  return (
    <div className="flex justify-center py-1">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 rounded-full"
        disabled={summarize.isLoading}
        onClick={fetchRecap}
      >
        {summarize.isLoading ? (
          <Spinner className="size-4" />
        ) : (
          <History className="size-4" aria-hidden="true" />
        )}
        {localize('com_ui_brainstorm_catch_up')}
      </Button>
      <OGDialog open={open} onOpenChange={setOpen}>
        <OGDialogTemplate
          title={localize('com_ui_brainstorm_catch_up_title')}
          className="w-11/12 md:max-w-lg"
          showCloseButton={true}
          main={
            <div className="max-h-96 overflow-y-auto text-sm">
              <MarkdownLite content={recap} />
            </div>
          }
        />
      </OGDialog>
    </div>
  );
}
