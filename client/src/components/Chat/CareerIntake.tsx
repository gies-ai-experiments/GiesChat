import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@librechat/client';
import { Constants, EToolResources, isAgentsEndpoint } from 'librechat-data-provider';
import type { TranslationKeys } from '~/hooks';
import { useLocalize, useSubmitMessage } from '~/hooks';
import useFileHandling from '~/hooks/Files/useFileHandling';
import { useChatContext } from '~/Providers';

const CAREER_AGENT_ID = 'agent_gies_career_prep';

const SEEKING_KEYS: Record<string, TranslationKeys> = {
  internship: 'com_ui_career_seeking_internship',
  full_time: 'com_ui_career_seeking_full_time',
  co_op: 'com_ui_career_seeking_co_op',
  exploring: 'com_ui_career_seeking_exploring',
};

export default function CareerIntake() {
  const localize = useLocalize();
  const { conversation, filesLoading, setFilesLoading } = useChatContext();
  const { handleFiles } = useFileHandling();
  const { submitMessage } = useSubmitMessage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [role, setRole] = useState('');
  const [seeking, setSeeking] = useState('internship');
  const [timeline, setTimeline] = useState('');
  const [targets, setTargets] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  const agentId = conversation?.agent_id ?? '';
  const isNewCareerChat =
    isAgentsEndpoint(conversation?.endpoint) &&
    agentId === CAREER_AGENT_ID &&
    (conversation?.conversationId === Constants.NEW_CONVO || !conversation?.conversationId);

  useEffect(() => {
    setDismissed(false);
  }, [agentId]);

  const send = () => {
    const lines = [
      localize('com_ui_career_intake_intro'),
      `- ${localize('com_ui_career_role_label')}: ${role.trim()}`,
      `- ${localize('com_ui_career_seeking_label')} ${localize(SEEKING_KEYS[seeking])}`,
      timeline.trim() && `- ${localize('com_ui_career_timeline_label')}: ${timeline.trim()}`,
      targets.trim() && `- ${localize('com_ui_career_targets_label')}: ${targets.trim()}`,
      resume != null && localize('com_ui_career_intake_resume_note'),
    ].filter(Boolean);
    submitMessage({ text: lines.join('\n') });
    setDismissed(true);
  };

  useEffect(() => {
    if (pending && !filesLoading) {
      setPending(false);
      send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, filesLoading]);

  if (!isNewCareerChat || dismissed) {
    return null;
  }

  const startPrep = () => {
    if (resume != null) {
      setFilesLoading(true);
      handleFiles([resume], EToolResources.file_search);
      setPending(true);
      return;
    }
    send();
  };

  const canStart = role.trim().length > 0 && !pending;
  const inputClass =
    'mt-1 w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring-primary';
  const labelClass = 'block text-xs font-medium text-text-secondary';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-label={localize('com_ui_career_intake_title')}
    >
      <div className="w-[520px] max-w-full rounded-xl bg-surface-dialog p-6 shadow-2xl">
        <h3 className="text-center text-lg font-bold text-text-primary">
          {localize('com_ui_career_intake_title')}
        </h3>
        <p className="mt-1 text-center text-sm text-text-secondary">
          {localize('com_ui_career_intake_desc')}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <label className={labelClass}>
            {localize('com_ui_career_role_label')}
            <input
              className={inputClass}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={localize('com_ui_career_role_placeholder')}
            />
          </label>
          <label className={labelClass}>
            {localize('com_ui_career_seeking_label')}
            <select
              className={inputClass}
              value={seeking}
              onChange={(e) => setSeeking(e.target.value)}
            >
              {Object.keys(SEEKING_KEYS).map((value) => (
                <option key={value} value={value}>
                  {localize(SEEKING_KEYS[value])}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            {localize('com_ui_career_timeline_label')}
            <input
              className={inputClass}
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder={localize('com_ui_career_timeline_placeholder')}
            />
          </label>
          <label className={labelClass}>
            {localize('com_ui_career_targets_label')}
            <input
              className={inputClass}
              value={targets}
              onChange={(e) => setTargets(e.target.value)}
              placeholder={localize('com_ui_career_targets_placeholder')}
            />
          </label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-dashed border-border-heavy px-3 py-3 text-sm text-text-secondary hover:border-border-xheavy hover:text-text-primary"
          >
            {resume ? resume.name : localize('com_ui_career_resume_label')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => setResume(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-sm font-semibold text-text-secondary hover:underline"
          >
            {localize('com_ui_career_skip')}
          </button>
          <button
            type="button"
            onClick={startPrep}
            disabled={!canStart}
            className="flex items-center gap-2 rounded-full bg-surface-submit px-5 py-2.5 text-sm font-bold text-white hover:bg-surface-submit-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending && <Spinner className="size-4" />}
            {localize('com_ui_career_start')}
          </button>
        </div>
      </div>
    </div>
  );
}
