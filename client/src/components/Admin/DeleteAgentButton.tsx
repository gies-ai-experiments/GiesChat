import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from 'librechat-data-provider';
import {
  Label,
  Button,
  OGDialog,
  TrashIcon,
  useToastContext,
  OGDialogTrigger,
  OGDialogTemplate,
} from '@librechat/client';
import { useDeleteAgentMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

/**
 * Row-level delete for the class dashboard.
 *
 * The builder's own `DeleteButton` is bound to the agent form (`useFormContext`, the create
 * mutation, the selected-agent setter) and cannot render in a table, so this reuses the same
 * mutation and confirm-dialog template without that coupling. Only rendered when the server
 * reports `canDelete` — DELETE is a separate permission bit from the EDIT that puts an agent
 * in the dashboard's scope.
 */
export default function DeleteAgentButton({
  agentId,
  agentName,
}: {
  agentId: string;
  agentName: string;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  const deleteAgent = useDeleteAgentMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_agent_deleted'), status: 'success' });
      queryClient.invalidateQueries([QueryKeys.adminAgentUsage]);
    },
    onError: () => {
      showToast({ message: localize('com_ui_agent_delete_error'), status: 'error' });
    },
  });

  const handleDelete = useCallback(
    () => deleteAgent.mutate({ agent_id: agentId }),
    [deleteAgent, agentId],
  );

  return (
    <OGDialog>
      <OGDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          disabled={deleteAgent.isLoading}
          aria-label={localize('com_ui_admin_delete_agent_named', { name: agentName })}
          title={localize('com_ui_delete_agent')}
        >
          <TrashIcon className="size-4 text-red-500" />
        </Button>
      </OGDialogTrigger>
      <OGDialogTemplate
        title={localize('com_ui_delete_agent')}
        className="max-w-[450px]"
        main={
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="delete-agent" className="text-left text-sm font-medium">
              {localize('com_ui_admin_delete_agent_confirm', { name: agentName })}
            </Label>
          </div>
        }
        selection={{
          selectHandler: handleDelete,
          selectClasses: 'bg-red-600 hover:bg-red-700 dark:hover:bg-red-800 text-white',
          selectText: localize('com_ui_delete'),
        }}
      />
    </OGDialog>
  );
}
