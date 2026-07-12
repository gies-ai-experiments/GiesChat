import React, { useRef } from 'react';
import { Check, Link, Pin, PinOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { OGDialog, OGDialogContent, Button, useToastContext } from '@librechat/client';
import {
  QueryKeys,
  Constants,
  EModelEndpoint,
  PermissionBits,
  LocalStorageKeys,
  AgentListResponse,
} from 'librechat-data-provider';
import type t from 'librechat-data-provider';
import { useLocalize, useDefaultConvo, useFavorites } from '~/hooks';
import { renderAgentAvatar, clearMessagesCache } from '~/utils';
import { useChatContext } from '~/Providers';

interface SupportContact {
  name?: string;
  email?: string;
}

interface AgentWithSupport extends t.Agent {
  support_contact?: SupportContact;
}

const formatLabel = (value: string) =>
  value
    .replace(/^\w+__/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getAgentCapabilities = (agent: AgentWithSupport): string[] => {
  const capabilities = new Set<string>();
  agent.tools?.forEach((tool) => capabilities.add(formatLabel(tool)));
  agent.skills?.forEach((skill) => capabilities.add(formatLabel(skill)));
  if (agent.artifacts) capabilities.add('Artifacts');
  return Array.from(capabilities).slice(0, 8);
};
interface AgentDetailProps {
  agent: AgentWithSupport; // The agent data to display
  isOpen: boolean; // Whether the detail dialog is open
  onClose: () => void; // Callback when dialog is closed
}

/**
 * Dialog for displaying agent details
 */
const AgentDetail: React.FC<AgentDetailProps> = ({ agent, isOpen, onClose }) => {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  const dialogRef = useRef<HTMLDivElement>(null);
  const getDefaultConversation = useDefaultConvo();
  const { conversation, newConversation } = useChatContext();
  const { isFavoriteAgent, toggleFavoriteAgent } = useFavorites();
  const isFavorite = isFavoriteAgent(agent?.id);
  const conversationStarters = agent?.conversation_starters?.filter(Boolean).slice(0, 4) ?? [];
  const capabilities = agent ? getAgentCapabilities(agent) : [];
  const creatorName = agent?.authorName;
  const category = agent?.category ? formatLabel(agent.category) : null;

  const handleFavoriteClick = () => {
    if (agent) {
      toggleFavoriteAgent(agent.id);
    }
  };

  /**
   * Navigate to chat with the selected agent
   */
  const handleStartChat = () => {
    if (agent) {
      const keys = [QueryKeys.agents, { requiredPermission: PermissionBits.EDIT }];
      const listResp = queryClient.getQueryData<AgentListResponse>(keys);
      if (listResp != null) {
        if (!listResp.data.some((a) => a.id === agent.id)) {
          const currentAgents = [agent, ...JSON.parse(JSON.stringify(listResp.data))];
          queryClient.setQueryData<AgentListResponse>(keys, { ...listResp, data: currentAgents });
        }
      }

      localStorage.setItem(`${LocalStorageKeys.AGENT_ID_PREFIX}0`, agent.id);

      clearMessagesCache(queryClient, conversation?.conversationId);
      queryClient.invalidateQueries([QueryKeys.messages]);

      /** Template with agent configuration */
      const template = {
        conversationId: Constants.NEW_CONVO as string,
        endpoint: EModelEndpoint.agents,
        agent_id: agent.id,
        title: localize('com_agents_chat_with', { name: agent.name || localize('com_ui_agent') }),
      };

      const currentConvo = getDefaultConversation({
        conversation: { ...(conversation ?? {}), ...template },
        preset: template,
      });

      newConversation({
        template: currentConvo,
        preset: template,
      });
    }
  };

  /**
   * Copy the agent's shareable link to clipboard
   */
  const handleCopyLink = () => {
    const baseUrl = new URL(window.location.origin);
    const chatUrl = `${baseUrl.origin}/c/new?agent_id=${agent.id}`;
    navigator.clipboard
      .writeText(chatUrl)
      .then(() => {
        showToast({
          message: localize('com_agents_link_copied'),
        });
      })
      .catch(() => {
        showToast({
          message: localize('com_agents_link_copy_failed'),
        });
      });
  };

  /**
   * Format contact information with mailto links when appropriate
   */
  const formatContact = () => {
    if (!agent?.support_contact) return null;

    const { name, email } = agent.support_contact;

    if (name && email) {
      return (
        <a href={`mailto:${email}`} className="text-primary hover:underline">
          {name}
        </a>
      );
    }

    if (email) {
      return (
        <a href={`mailto:${email}`} className="text-primary hover:underline">
          {email}
        </a>
      );
    }

    if (name) {
      return <span>{name}</span>;
    }

    return null;
  };

  return (
    <OGDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <OGDialogContent
        ref={dialogRef}
        className="flex max-h-[92vh] w-11/12 max-w-2xl flex-col overflow-hidden border-border-medium bg-surface-primary p-0"
      >
        <div className="overflow-y-auto px-6 pb-4 pt-12 sm:px-10">
          <div className="absolute left-5 top-5 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleFavoriteClick}
              title={isFavorite ? localize('com_ui_unpin') : localize('com_ui_pin')}
              aria-label={isFavorite ? localize('com_ui_unpin') : localize('com_ui_pin')}
              className="rounded-full"
            >
              {isFavorite ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyLink}
              title={localize('com_agents_copy_link')}
              aria-label={localize('com_agents_copy_link')}
              className="rounded-full"
            >
              <Link className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <header className="mx-auto max-w-xl border-b border-border-light pb-8 text-center">
            <div className="flex justify-center rounded-full">
              {renderAgentAvatar(agent, {
                size: 'xl',
                className:
                  'rounded-full ring-4 ring-[color:var(--illini-orange)] ring-offset-4 ring-offset-surface-primary',
              })}
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              {agent?.name || localize('com_agents_loading')}
            </h2>
            {(creatorName || category) && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 text-sm text-text-secondary">
                {creatorName && (
                  <span>
                    {localize('com_agents_created_by')} {creatorName}
                  </span>
                )}
                {creatorName && category && <span aria-hidden="true">·</span>}
                {category && <span>{category}</span>}
              </div>
            )}
            {agent?.support_contact && formatContact() && (
              <div className="mt-2 text-sm text-text-secondary">
                {localize('com_agents_contact')}: {formatContact()}
              </div>
            )}
            {agent?.description && (
              <p className="mx-auto mt-5 whitespace-pre-wrap text-base leading-7 text-text-primary sm:text-lg">
                {agent.description}
              </p>
            )}
          </header>

          {conversationStarters.length > 0 && (
            <section className="border-b border-border-light py-7" aria-labelledby="agent-starters">
              <h3 id="agent-starters" className="text-xl font-bold text-text-primary">
                {localize('com_agents_try_asking')}
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {conversationStarters.map((starter) => (
                  <div
                    key={starter}
                    className="rounded-xl border border-border-medium bg-surface-secondary px-4 py-3 text-sm leading-6 text-text-primary"
                  >
                    {starter}
                  </div>
                ))}
              </div>
            </section>
          )}

          {capabilities.length > 0 && (
            <section className="py-7" aria-labelledby="agent-capabilities">
              <h3 id="agent-capabilities" className="text-xl font-bold text-text-primary">
                {localize('com_assistants_capabilities')}
              </h3>
              <ul className="mt-4 grid gap-3">
                {capabilities.map((capability) => (
                  <li key={capability} className="flex items-center gap-3 text-text-primary">
                    <Check
                      className="h-5 w-5 shrink-0 text-[color:var(--illini-orange)]"
                      aria-hidden="true"
                    />
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="border-t border-border-medium bg-surface-primary px-6 py-4 sm:px-10">
          <Button
            variant="submit"
            className="h-12 w-full rounded-full bg-[color:var(--illini-orange)] text-base font-semibold text-white hover:bg-[color:var(--illini-orange-hover)]"
            onClick={handleStartChat}
            disabled={!agent}
          >
            {agent?.name
              ? `${localize('com_agents_start_chat')} with ${agent.name}`
              : localize('com_agents_start_chat')}
          </Button>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
};

export default AgentDetail;
