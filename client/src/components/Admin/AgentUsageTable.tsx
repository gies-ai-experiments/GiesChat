import React, { useCallback } from 'react';
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableCaption,
} from '@librechat/client';
import type { AdminAgentUsage } from 'librechat-data-provider';
import { useAdminAgentUsageQuery } from '~/data-provider';
import DeleteAgentButton from './DeleteAgentButton';
import { formatLastActivity } from './activity';
import { useLocalize } from '~/hooks';
import QueryState from './QueryState';

interface AgentUsageTableProps {
  groupId: string;
  days: number;
  onSelectAgent: (agent: AdminAgentUsage) => void;
}

export default function AgentUsageTable({ groupId, days, onSelectAgent }: AgentUsageTableProps) {
  const localize = useLocalize();
  const params = { days, ...(groupId ? { groupId } : {}) };
  const { data, isLoading, error, refetch } = useAdminAgentUsageQuery(params);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const agents = data?.agents ?? [];

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      isEmpty={agents.length === 0}
      emptyKey="com_ui_admin_agents_empty"
      errorKey="com_ui_admin_agents_error"
      onRetry={handleRetry}
    >
      <Table>
        <TableCaption className="sr-only">{localize('com_ui_admin_agents_caption')}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{localize('com_ui_admin_col_agent')}</TableHead>
            <TableHead scope="col" className="text-right">
              {localize('com_ui_admin_col_conversations')}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {localize('com_ui_admin_col_students')}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {localize('com_ui_admin_col_messages')}
            </TableHead>
            <TableHead scope="col">{localize('com_ui_admin_col_last_activity')}</TableHead>
            <TableHead scope="col" className="w-px text-right">
              <span className="sr-only">{localize('com_ui_admin_col_actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.agent_id}>
              <TableCell>
                <button
                  type="button"
                  className="rounded text-left font-medium text-text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-heavy"
                  aria-label={localize('com_ui_admin_view_progress', { name: agent.name })}
                  onClick={() => onSelectAgent(agent)}
                >
                  {agent.name}
                </button>
              </TableCell>
              <TableCell className="text-right tabular-nums">{agent.conversationCount}</TableCell>
              <TableCell className="text-right tabular-nums">{agent.userCount}</TableCell>
              <TableCell className="text-right tabular-nums">{agent.messageCount}</TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                {formatLastActivity(agent.lastActivity) ?? localize('com_ui_none')}
              </TableCell>
              <TableCell className="text-right">
                {agent.canDelete && (
                  <DeleteAgentButton agentId={agent.agent_id} agentName={agent.name} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </QueryState>
  );
}
