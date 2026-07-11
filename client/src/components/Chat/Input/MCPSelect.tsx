import React, { memo, useMemo } from 'react';
import * as Ariakit from '@ariakit/react';
import { ChevronDown } from 'lucide-react';
import { PermissionTypes, Permissions, isAgentsEndpoint } from 'librechat-data-provider';
import { TooltipAnchor } from '@librechat/client';
import type { MCPServerDefinition } from '~/hooks/MCP/useMCPServerManager';
import MCPServerMenuItem from '~/components/MCP/MCPServerMenuItem';
import MCPConfigDialog from '~/components/MCP/MCPConfigDialog';
import StackedMCPIcons from '~/components/MCP/StackedMCPIcons';
import { useBadgeRowContext, useChatContext, useAgentsMapContext } from '~/Providers';
import { useHasAccess, useLocalize } from '~/hooks';
import { cn } from '~/utils';

function MCPSelectContent() {
  const localize = useLocalize();
  const context = useBadgeRowContext();
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const { conversationId, storageContextKey, mcpServerManager: manager } = context ?? {};

  const menuStore = Ariakit.useMenuStore({ focusLoop: true });
  const isOpen = menuStore.useState('open');

  /** Servers attached to the active agent — always in use during its runs, shown read-only */
  const agentServers = useMemo(() => {
    const agentId = isAgentsEndpoint(conversation?.endpoint) ? conversation?.agent_id : undefined;
    if (!agentId) {
      return [];
    }
    const serverNames = agentsMap?.[agentId]?.mcp_servers ?? [];
    return serverNames
      .map((name) => manager?.selectableServers?.find((s) => s.serverName === name))
      .filter((s): s is MCPServerDefinition => s != null);
  }, [conversation?.endpoint, conversation?.agent_id, agentsMap, manager?.selectableServers]);

  const selectedServers = useMemo(() => {
    const selectedSet = new Set(manager?.mcpValues ?? []);
    const agentNames = new Set(agentServers.map((s) => s.serverName));
    const userSelected =
      manager?.selectableServers?.filter(
        (s) => selectedSet.has(s.serverName) && !agentNames.has(s.serverName),
      ) ?? [];
    return [...agentServers, ...userSelected];
  }, [manager?.selectableServers, manager?.mcpValues, agentServers]);

  const displayText = useMemo(() => {
    if (selectedServers.length === 0) {
      return null;
    }
    if (selectedServers.length === 1) {
      const server = selectedServers[0];
      return server.config?.title || server.serverName;
    }
    return localize('com_ui_x_selected', { 0: selectedServers.length });
  }, [selectedServers, localize]);

  if (!manager) {
    return null;
  }

  const {
    isPinned,
    mcpValues,
    isInitializing,
    placeholderText,
    connectionStatus,
    selectableServers,
    getConfigDialogProps,
    toggleServerSelection,
    getServerStatusIconProps,
  } = manager;

  if (!isPinned && selectedServers.length === 0) {
    return null;
  }

  const configDialogProps = getConfigDialogProps();

  return (
    <>
      <Ariakit.MenuProvider store={menuStore}>
        <TooltipAnchor
          description={placeholderText}
          disabled={isOpen}
          render={
            <Ariakit.MenuButton
              className={cn(
                'group relative inline-flex items-center justify-center gap-1.5',
                'border border-border-medium text-sm font-medium transition-all',
                'h-9 min-w-9 rounded-full bg-transparent px-2.5 shadow-sm',
                'hover:bg-surface-hover hover:shadow-md active:shadow-inner',
                'md:w-fit md:justify-start md:px-3',
                isOpen && 'bg-surface-hover',
              )}
            />
          }
        >
          <StackedMCPIcons selectedServers={selectedServers} maxIcons={3} iconSize="sm" />
          <span className="hidden truncate text-text-primary md:block">
            {displayText || placeholderText}
          </span>
          <ChevronDown
            className={cn(
              'hidden h-3 w-3 text-text-secondary transition-transform md:block',
              isOpen && 'rotate-180',
            )}
          />
        </TooltipAnchor>

        <Ariakit.Menu
          portal={true}
          gutter={8}
          modal={true}
          unmountOnHide={true}
          aria-label={localize('com_ui_mcp_servers')}
          className={cn(
            'z-50 flex min-w-[260px] max-w-[320px] flex-col rounded-xl',
            'border border-border-light bg-presentation p-1.5 shadow-lg',
            'origin-top opacity-0 transition-[opacity,transform] duration-200 ease-out',
            'data-[enter]:scale-100 data-[enter]:opacity-100',
            'scale-95 data-[leave]:scale-95 data-[leave]:opacity-0',
          )}
        >
          <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto">
            {agentServers.length > 0 && (
              <>
                <div className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-text-secondary">
                  {localize('com_ui_mcp_used_by_agent')}
                </div>
                {agentServers.map((server) => (
                  <MCPServerMenuItem
                    key={`agent-${server.serverName}`}
                    server={server}
                    isSelected={true}
                    connectionStatus={connectionStatus}
                    isInitializing={isInitializing}
                    statusIconProps={getServerStatusIconProps(server.serverName)}
                    onToggle={() => {}}
                  />
                ))}
                <div className="my-1 h-px bg-border-light" aria-hidden="true" />
              </>
            )}
            {selectableServers
              .filter((server) => !agentServers.some((s) => s.serverName === server.serverName))
              .map((server) => (
                <MCPServerMenuItem
                  key={server.serverName}
                  server={server}
                  isSelected={mcpValues?.includes(server.serverName) ?? false}
                  connectionStatus={connectionStatus}
                  isInitializing={isInitializing}
                  statusIconProps={getServerStatusIconProps(server.serverName)}
                  onToggle={toggleServerSelection}
                />
              ))}
          </div>
        </Ariakit.Menu>
      </Ariakit.MenuProvider>
      {configDialogProps && (
        <MCPConfigDialog
          {...configDialogProps}
          conversationId={conversationId}
          storageContextKey={storageContextKey}
        />
      )}
    </>
  );
}

function MCPSelect() {
  const context = useBadgeRowContext();
  const { selectableServers } = context?.mcpServerManager ?? {};
  const canUseMcp = useHasAccess({
    permissionType: PermissionTypes.MCP_SERVERS,
    permission: Permissions.USE,
  });

  if (!canUseMcp || !selectableServers || selectableServers.length === 0) {
    return null;
  }

  return <MCPSelectContent />;
}

export default memo(MCPSelect);
