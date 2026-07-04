import { useState } from 'react';
import { useRecoilValue } from 'recoil';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Constants, QueryKeys } from 'librechat-data-provider';
import { Button, OGDialog, OGDialogTemplate, Spinner, useToastContext } from '@librechat/client';
import type { TMessage } from 'librechat-data-provider';
import { useListAgentsQuery } from '~/data-provider/Agents/queries';
import { useCreateRoomMutation } from '~/data-provider';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import store from '~/store';

const CONTEXT_CAP = 20000;

export default function NewRoomDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  const [title, setTitle] = useState('');
  const [agentId, setAgentId] = useState('');
  const [includeContext, setIncludeContext] = useState(false);
  const createRoom = useCreateRoomMutation();
  const { data: agents } = useListAgentsQuery(undefined, { enabled: open });
  const conversation = useRecoilValue(store.conversationByIndex(0));

  const conversationId = conversation?.conversationId ?? '';
  const hasConversation =
    conversationId !== '' &&
    conversationId !== Constants.NEW_CONVO &&
    conversationId !== Constants.PENDING_CONVO;

  const buildContextText = (): string | undefined => {
    if (!includeContext || !hasConversation) {
      return undefined;
    }
    const messages = queryClient.getQueryData<TMessage[]>([QueryKeys.messages, conversationId]);
    if (!messages || messages.length === 0) {
      return undefined;
    }
    return messages
      .map((m) => `${m.sender || (m.isCreatedByUser ? 'User' : 'AI')}: ${m.text ?? ''}`)
      .join('\n\n')
      .slice(0, CONTEXT_CAP);
  };

  const submit = () => {
    if (title.trim().length === 0 || createRoom.isLoading) {
      return;
    }
    createRoom.mutate(
      {
        title: title.trim(),
        agentId: agentId === '' ? undefined : agentId,
        contextText: buildContextText(),
      },
      {
        onSuccess: (room) => {
          setOpen(false);
          setTitle('');
          navigate(`/brainstorm/${room.roomId}`);
        },
        onError: () =>
          showToast({
            message: localize('com_ui_brainstorm_error'),
            severity: NotificationSeverity.ERROR,
            showIcon: true,
          }),
      },
    );
  };

  return (
    <OGDialog open={open} onOpenChange={setOpen}>
      <OGDialogTemplate
        title={localize('com_ui_brainstorm_new_room')}
        className="w-11/12 md:max-w-md"
        showCloseButton={false}
        main={
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              {localize('com_ui_brainstorm_room_title')}
              <input
                type="text"
                value={title}
                maxLength={200}
                autoFocus={true}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="rounded-lg border border-border-light bg-surface-primary px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {localize('com_ui_brainstorm_persona')}
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="rounded-lg border border-border-light bg-surface-primary px-3 py-2"
              >
                <option value="">{localize('com_ui_brainstorm_default_persona')}</option>
                {(agents?.data ?? []).map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>
            {hasConversation && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeContext}
                  onChange={(e) => setIncludeContext(e.target.checked)}
                />
                {localize('com_ui_brainstorm_context_include')}
              </label>
            )}
          </div>
        }
        buttons={
          <Button
            variant="submit"
            disabled={title.trim().length === 0 || createRoom.isLoading}
            onClick={submit}
            className="text-white"
          >
            {createRoom.isLoading ? <Spinner /> : localize('com_ui_brainstorm_create')}
          </Button>
        }
      />
    </OGDialog>
  );
}
