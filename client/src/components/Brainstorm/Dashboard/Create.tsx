import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, useToastContext } from '@librechat/client';
import { useListAgentsQuery } from '~/data-provider/Agents/queries';
import { useCreateRoomMutation } from '~/data-provider';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import Shell from './Shell';

const CONTEXT_CAP = 20000;

const fieldClass =
  'rounded-md border border-border-light bg-surface-primary p-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-surface-submit focus:outline-none focus:ring-2 focus:ring-surface-submit/20';

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="text-[13px] text-text-primary">
      {label}
      {hint != null && <span className="text-text-secondary"> ({hint})</span>}
    </span>
  );
}

export default function Create() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [title, setTitle] = useState('');
  const [agentId, setAgentId] = useState('');
  const [contextText, setContextText] = useState('');
  const createRoom = useCreateRoomMutation();
  const { data: agents } = useListAgentsQuery();

  const canSubmit = title.trim().length > 0 && !createRoom.isLoading;

  const submit = () => {
    if (!canSubmit) {
      return;
    }
    createRoom.mutate(
      {
        title: title.trim(),
        agentId: agentId === '' ? undefined : agentId,
        contextText: contextText.trim() === '' ? undefined : contextText.trim(),
      },
      {
        onSuccess: (room) => navigate(`/brainstorm/${room.roomId}`),
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
    <Shell title={localize('com_ui_brainstorm_create_room')}>
      <div className="rounded-[14px] border border-border-light bg-surface-primary shadow-[0_1px_2px_rgba(16,33,71,0.04)]">
        <div className="border-b border-border-light px-5 py-[18px]">
          <h2 className="text-base font-bold text-text-primary">
            {localize('com_ui_brainstorm_create_title')}{' '}
            <span className="font-sans text-xs font-medium text-text-secondary">
              {localize('com_ui_brainstorm_create_subtitle')}
            </span>
          </h2>
        </div>
        <form
          className="grid max-w-[720px] gap-3 px-5 pb-5 pt-[18px]"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="grid gap-1">
            <FieldLabel label={localize('com_ui_brainstorm_display_name')} />
            <input
              type="text"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={localize('com_ui_brainstorm_display_name_placeholder')}
              className={fieldClass}
            />
          </label>

          <label className="grid gap-1">
            <FieldLabel
              label={localize('com_ui_brainstorm_persona')}
              hint={localize('com_ui_brainstorm_optional')}
            />
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className={fieldClass}
            >
              <option value="">{localize('com_ui_brainstorm_default_persona')}</option>
              {(agents?.data ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-1">
            <div className="flex items-baseline justify-between">
              <label htmlFor="brainstorm-system-prompt">
                <FieldLabel
                  label={localize('com_ui_brainstorm_system_prompt')}
                  hint={localize('com_ui_brainstorm_optional')}
                />
              </label>
              <span className="text-xs tabular-nums text-text-secondary">
                {contextText.length.toLocaleString()} / {CONTEXT_CAP.toLocaleString()}
              </span>
            </div>
            <textarea
              id="brainstorm-system-prompt"
              rows={4}
              value={contextText}
              maxLength={CONTEXT_CAP}
              onChange={(e) => setContextText(e.target.value)}
              placeholder={localize('com_ui_brainstorm_system_prompt_placeholder')}
              className={cn(fieldClass, 'resize-y font-mono text-[13px]')}
            />
          </div>

          <p className="text-xs text-text-secondary">{localize('com_ui_brainstorm_create_note')}</p>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-fit items-center gap-2 rounded-md bg-surface-submit px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-surface-submit-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createRoom.isLoading && <Spinner className="size-4" />}
            {localize('com_ui_brainstorm_create')}
          </button>
        </form>
      </div>
    </Shell>
  );
}
