import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export default function AgentsPageHeader({
  isMyAgents,
  canCreate,
  onBrowse,
  onMyAgents,
  onCreate,
  leading,
}: {
  isMyAgents: boolean;
  canCreate: boolean;
  onBrowse: () => void;
  onMyAgents: () => void;
  onCreate: () => void;
  leading?: ReactNode;
}) {
  const localize = useLocalize();
  const modeClass = (active: boolean) =>
    cn(
      'border-b-2 px-1 pb-3 pt-2 text-sm font-semibold transition-colors',
      active
        ? 'border-orange-500 text-text-primary'
        : 'border-transparent text-text-secondary hover:text-text-primary',
    );

  return (
    <header className="border-b border-border-light bg-presentation">
      <div className="container mx-auto max-w-4xl px-4 pt-5 md:pt-7">
        <div className="flex items-start gap-3">
          {leading && <div className="pt-0.5 md:hidden">{leading}</div>}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
              {localize('com_ui_agents')}
            </h1>
            <p className="mt-1 text-sm text-text-secondary md:text-base">
              {localize('com_agents_marketplace_subtitle')}
            </p>
          </div>
          {canCreate && (
            <Button
              className="shrink-0 gap-1.5 rounded-xl bg-[#FF5F05] text-white hover:bg-[#e95605]"
              onClick={onCreate}
              aria-label={localize('com_agents_create')}
              data-testid="marketplace-create-agent-button"
            >
              <Plus className="icon-md" aria-hidden="true" />
              <span className="hidden sm:inline">{localize('com_agents_create')}</span>
            </Button>
          )}
        </div>
        <div role="tablist" aria-label={localize('com_ui_agents')} className="mt-4 flex gap-5">
          <button
            type="button"
            role="tab"
            aria-selected={!isMyAgents}
            className={modeClass(!isMyAgents)}
            onClick={onBrowse}
          >
            {localize('com_agents_browse')}
          </button>
          {canCreate && (
            <button
              type="button"
              role="tab"
              aria-selected={isMyAgents}
              className={modeClass(isMyAgents)}
              onClick={onMyAgents}
            >
              {localize('com_agents_my_agents')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
