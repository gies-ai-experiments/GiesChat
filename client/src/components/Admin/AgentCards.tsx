import React, { useMemo } from 'react';
import type { AdminAgentUsage } from 'librechat-data-provider';
import { useAgentCategories, useLocalize, TranslationKeys } from '~/hooks';
import { useAdminAgentUsageQuery } from '~/data-provider';
import { cn, renderAgentAvatar } from '~/utils';

interface AgentCardsProps {
  groupId: string;
  days: number;
  selectedAgentId: string | null;
  onSelectAgent: (agent: AdminAgentUsage) => void;
}

export default function AgentCards({
  groupId,
  days,
  selectedAgentId,
  onSelectAgent,
}: AgentCardsProps) {
  const localize = useLocalize();
  const { categories } = useAgentCategories();
  const params = { days, ...(groupId ? { groupId } : {}) };
  const { data } = useAdminAgentUsageQuery(params);

  const labelByCategory = useMemo(
    () => new Map(categories.map((category) => [category.value, category.label])),
    [categories],
  );

  /** Seeded categories carry a translation key as their label; user-made ones carry text. */
  const resolveCategoryLabel = (category: string | null): string => {
    if (category == null || category === '') {
      return '';
    }
    const label = labelByCategory.get(category);
    if (label == null) {
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
    return label.startsWith('com_') ? localize(label as TranslationKeys) : label;
  };

  const agents = data?.agents ?? [];
  if (agents.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label={localize('com_ui_admin_agents_grid_label')}
      className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {agents.map((agent) => {
        const isSelected = agent.agent_id === selectedAgentId;
        const categoryLabel = resolveCategoryLabel(agent.category);
        return (
          <li key={agent.agent_id}>
            <button
              type="button"
              aria-current={isSelected ? 'true' : undefined}
              onClick={() => onSelectAgent(agent)}
              className={cn(
                'relative flex h-full w-full gap-4 rounded-xl px-4 py-3 text-left',
                'bg-surface-tertiary transition-colors duration-150 hover:bg-surface-hover',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-heavy',
                isSelected && 'bg-surface-hover ring-2 ring-border-heavy',
              )}
            >
              {categoryLabel !== '' && (
                <span className="absolute right-3 top-2 rounded-md bg-surface-hover px-2 py-0.5 text-xs text-text-secondary">
                  {categoryLabel}
                </span>
              )}
              <span className="flex-shrink-0 self-center">
                {renderAgentAvatar(agent, { size: 'sm', showBorder: false })}
              </span>
              <span className="flex min-w-0 flex-1 flex-col justify-center">
                <span className="line-clamp-2 pr-14 font-semibold text-text-primary">
                  {agent.name}
                </span>
                {agent.description != null && agent.description !== '' && (
                  <span className="mt-0.5 line-clamp-2 text-sm leading-snug text-text-secondary">
                    {agent.description}
                  </span>
                )}
                <span className="mt-1 text-xs tabular-nums text-text-secondary">
                  {localize('com_ui_admin_card_stats', {
                    convos: agent.conversationCount,
                    students: agent.userCount,
                  })}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
