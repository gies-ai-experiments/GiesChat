import { useEffect, useState } from 'react';
import { Spinner, useToastContext } from '@librechat/client';
import type { TRoomBuildStackType } from 'librechat-data-provider';
import { useLocalize, useMCPConnectionStatus } from '~/hooks';
import { useMCPServerManager } from '~/hooks/MCP';
import { useDraftRoomBuildMutation, useStartRoomBuildMutation } from '~/data-provider';

const STACK_TYPES: TRoomBuildStackType[] = [
  'react_website',
  'mobile_app',
  'data_visualization',
  'slides',
  '3d_game',
  'document',
  'spreadsheet',
  'design',
  'animation',
];

export default function BuildAppDialog({
  roomId,
  open,
  onClose,
}: {
  roomId: string;
  open: boolean;
  onClose: () => void;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { connectionStatus } = useMCPConnectionStatus({ enabled: open });
  const { initializeServer } = useMCPServerManager();
  const draft = useDraftRoomBuildMutation(roomId);
  const start = useStartRoomBuildMutation(roomId);
  const [prompt, setPrompt] = useState('');
  const [stackType, setStackType] = useState<TRoomBuildStackType>('react_website');
  const [requested, setRequested] = useState(false);

  const connected = connectionStatus?.replit?.connectionState === 'connected';

  useEffect(() => {
    if (!open) {
      setRequested(false);
      setPrompt('');
      return;
    }
    if (open && connected && !requested) {
      setRequested(true);
      draft.mutate(undefined, {
        onSuccess: (data) => setPrompt(data.prompt),
        onError: () =>
          showToast({ message: localize('com_ui_brainstorm_build_draft_error'), status: 'error' }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, connected]);

  if (!open) {
    return null;
  }

  const startBuild = () => {
    if (prompt.trim().length === 0) {
      return;
    }
    start.mutate(
      { prompt: prompt.trim(), stackType },
      {
        onSuccess: onClose,
        onError: () => {
          showToast({ message: localize('com_ui_brainstorm_build_start_error'), status: 'error' });
          onClose();
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#13294B]/40 p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[560px] max-w-full rounded-xl bg-white p-6 shadow-2xl dark:bg-surface-primary">
        {!connected ? (
          <div className="text-center">
            <h3 className="font-display text-lg font-bold text-[#13294B] dark:text-text-primary">
              {localize('com_ui_brainstorm_build_connect_title')}
            </h3>
            <p className="mx-auto mt-2 max-w-[40ch] text-sm text-text-secondary">
              {localize('com_ui_brainstorm_build_connect_desc')}
            </p>
            <button
              type="button"
              onClick={() => initializeServer('replit')}
              className="mt-4 rounded-lg bg-[#13294B] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              <span>{localize('com_ui_brainstorm_build_connect_action')}</span>
              <span aria-hidden="true"> →</span>
            </button>
            <p className="mt-3 text-xs text-text-secondary">
              {localize('com_ui_brainstorm_build_connect_fine')}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold text-text-secondary hover:underline"
              >
                {localize('com_ui_brainstorm_build_cancel')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-display text-lg font-bold text-[#13294B] dark:text-text-primary">
              {localize('com_ui_brainstorm_build_title')}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {localize('com_ui_brainstorm_build_desc')}
            </p>
            <label className="sr-only" htmlFor="build-prompt">
              {localize('com_ui_brainstorm_build_prompt_label')}
            </label>
            <textarea
              id="build-prompt"
              aria-label={localize('com_ui_brainstorm_build_prompt_label')}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={draft.isLoading ? '…' : ''}
              className="mt-3 h-[150px] w-full resize-y rounded-lg border border-[#E5E7EB] p-3 text-sm text-text-primary dark:border-border-light dark:bg-surface-secondary"
            />
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              {localize('com_ui_brainstorm_build_type_label')}
              <select
                aria-label={localize('com_ui_brainstorm_build_type_label')}
                value={stackType}
                onChange={(e) => setStackType(e.target.value as TRoomBuildStackType)}
                className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-sm dark:border-border-light dark:bg-surface-secondary"
              >
                {STACK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {localize(
                      `com_ui_brainstorm_build_type_${t}` as Parameters<typeof localize>[0],
                    )}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-3 text-xs text-text-secondary">
              {localize('com_ui_brainstorm_build_fine_print')}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-gray-50 dark:border-border-light"
              >
                {localize('com_ui_brainstorm_build_cancel')}
              </button>
              <button
                type="button"
                onClick={startBuild}
                disabled={draft.isLoading || start.isLoading || prompt.trim().length === 0}
                className="flex items-center gap-2 rounded-lg bg-[#FF5F05] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {start.isLoading && <Spinner className="size-4" />}
                {localize('com_ui_brainstorm_build_start')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
