import React from 'react';
import {
  Pencil,
  PlugZap,
  MoreHorizontal,
  SlidersHorizontal,
  RefreshCw,
  X,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipAnchor,
} from '@librechat/client';
import type { MCPServerStatus } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface MCPCardActionsProps {
  serverName: string;
  serverStatus?: MCPServerStatus;
  isInitializing: boolean;
  canCancel: boolean;
  hasCustomUserVars: boolean;
  canEdit: boolean;
  editButtonRef?: React.RefObject<HTMLDivElement>;
  onEditClick: () => void;
  onConfigClick: () => void;
  onInitialize: () => void;
  onCancel: () => void;
  onRevoke?: () => void;
}

/**
 * Compact overflow menu for MCP server card actions.
 *
 * Unified icon system (each icon has ONE meaning):
 * - Pencil: Edit server definition (Settings panel only)
 * - PlugZap: Connect/Authenticate (for disconnected/error servers)
 * - SlidersHorizontal: Configure custom variables (for connected servers with vars)
 * - Trash2: Revoke OAuth access (for connected OAuth servers)
 * - RefreshCw: Reconnect/Refresh (for connected servers)
 * Keeping one fixed-width trigger leaves the narrow sidebar enough room for the server name.
 */
export default function MCPCardActions({
  serverName,
  serverStatus,
  isInitializing,
  canCancel,
  hasCustomUserVars,
  canEdit,
  editButtonRef,
  onEditClick,
  onConfigClick,
  onInitialize,
  onCancel,
  onRevoke,
}: MCPCardActionsProps) {
  const localize = useLocalize();

  const connectionState = serverStatus?.connectionState;
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';
  const isDisconnected = connectionState === 'disconnected';
  const isError = connectionState === 'error';

  const isBusy = isInitializing || isConnecting;
  const hasActions =
    canEdit ||
    (isBusy && canCancel) ||
    isDisconnected ||
    isError ||
    (isConnected && hasCustomUserVars) ||
    isConnected ||
    (serverStatus?.requiresOAuth && onRevoke != null);

  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TooltipAnchor
          ref={editButtonRef}
          description={localize('com_ui_more_options')}
          side="top"
          render={
            <button
              type="button"
              className={cn(
                'flex size-7 items-center justify-center rounded-md text-text-secondary',
                'transition-colors duration-150 hover:bg-surface-tertiary hover:text-text-primary',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy',
              )}
              aria-label={`${localize('com_ui_more_options')}: ${serverName}`}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          }
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="min-w-40">
        {canEdit && (
          <DropdownMenuItem onSelect={onEditClick}>
            <Pencil aria-hidden="true" />
            {localize('com_ui_edit')}
          </DropdownMenuItem>
        )}
        {isBusy && canCancel && (
          <DropdownMenuItem onSelect={onCancel}>
            <X aria-hidden="true" />
            {localize('com_ui_cancel')}
          </DropdownMenuItem>
        )}
        {!isBusy && (isDisconnected || isError) && (
          <DropdownMenuItem onSelect={onInitialize}>
            <PlugZap aria-hidden="true" />
            {localize('com_nav_mcp_connect')}
          </DropdownMenuItem>
        )}
        {!isBusy && isConnected && hasCustomUserVars && (
          <DropdownMenuItem onSelect={onConfigClick}>
            <SlidersHorizontal aria-hidden="true" />
            {localize('com_ui_configure')}
          </DropdownMenuItem>
        )}
        {!isBusy && isConnected && (
          <DropdownMenuItem onSelect={onInitialize}>
            <RefreshCw aria-hidden="true" />
            {localize('com_nav_mcp_reconnect')}
          </DropdownMenuItem>
        )}
        {!isBusy && serverStatus?.requiresOAuth && onRevoke && (
          <DropdownMenuItem variant="destructive" onSelect={onRevoke}>
            <Trash2 aria-hidden="true" />
            {localize('com_ui_revoke')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
