import React from 'react';
import { Button } from '@librechat/client';
import { ResourceType } from 'librechat-data-provider';
import GenericGrantAccessDialog from '~/components/Sharing/GenericGrantAccessDialog';
import { useGetAgentByIdQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';

interface ShareWithClassProps {
  agentId: string;
  agentName: string;
}

/**
 * Thin wrapper over the app's existing sharing dialog so a professor can grant a
 * class access to one of their agents without leaving the dashboard. The dialog
 * needs the agent's database id, which the usage endpoint does not return.
 */
export default function ShareWithClass({ agentId, agentName }: ShareWithClassProps) {
  const localize = useLocalize();
  const { data: agent } = useGetAgentByIdQuery(agentId);
  const label = localize('com_ui_admin_share_with_class');

  if (!agent?._id) {
    const reasonId = `share-unavailable-${agentId}`;
    return (
      <>
        <Button variant="outline" disabled aria-describedby={reasonId}>
          {label}
        </Button>
        <span id={reasonId} className="sr-only">
          {localize('com_ui_admin_share_unavailable')}
        </span>
      </>
    );
  }

  return (
    <GenericGrantAccessDialog
      resourceDbId={agent._id}
      resourceId={agentId}
      resourceName={agentName}
      resourceType={ResourceType.AGENT}
    >
      <Button variant="outline">{label}</Button>
    </GenericGrantAccessDialog>
  );
}
