import { useEffect, useState } from 'react';
import { Bug, LoaderCircle } from 'lucide-react';
import { OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle } from '@librechat/client';
import { useSubmitIssueMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

export default function ReportIssueDialog() {
  const localize = useLocalize();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<{
    reportId: string;
    diagnosis: string;
    confidence: string;
  } | null>(null);
  const submit = useSubmitIssueMutation();
  const resetSubmit = submit.reset;

  useEffect(() => {
    if (!open) {
      setDescription('');
      setResult(null);
      resetSubmit();
    }
  }, [open, resetSubmit]);

  const handleSubmit = () => {
    const value = description.trim();
    if (value.length < 10 || submit.isLoading) {
      return;
    }
    submit.mutate(
      {
        description: value,
        route: `${window.location.pathname}${window.location.search}`,
        userAgent: navigator.userAgent,
        occurredAt: new Date().toISOString(),
      },
      { onSuccess: (data) => setResult(data) },
    );
  };

  return (
    <>
      <button
        type="button"
        data-tour="report-issue"
        onClick={() => setOpen(true)}
        aria-label={localize('com_ui_report_issue')}
        title={localize('com_ui_report_issue')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-medium bg-surface-primary text-text-secondary transition-colors hover:border-[var(--illini-orange)] hover:text-[var(--illini-orange)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--illini-orange)]"
      >
        <Bug className="h-4 w-4" aria-hidden="true" />
      </button>
      <OGDialog open={open} onOpenChange={setOpen}>
        <OGDialogContent className="w-11/12 max-w-lg" aria-describedby={undefined}>
          <OGDialogHeader>
            <OGDialogTitle>{localize('com_ui_report_issue')}</OGDialogTitle>
          </OGDialogHeader>
          {result ? (
            <div className="space-y-4 text-sm text-text-primary">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <p className="font-semibold">{localize('com_ui_report_received')}</p>
                <p className="mt-1 text-text-secondary">
                  {localize('com_ui_report_reference', { reportId: result.reportId })}
                </p>
              </div>
              <div>
                <p className="font-semibold">
                  {localize('com_ui_report_diagnosis', { confidence: result.confidence })}
                </p>
                <p className="mt-1 text-text-secondary">{result.diagnosis}</p>
              </div>
              <p className="text-xs text-text-tertiary">{localize('com_ui_report_privacy_note')}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-[var(--illini-blue)] px-4 py-2 font-semibold text-white hover:opacity-90"
              >
                {localize('com_ui_done')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="issue-description"
                  className="text-sm font-semibold text-text-primary"
                >
                  {localize('com_ui_report_what_happened')}
                </label>
                <textarea
                  id="issue-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                  rows={6}
                  placeholder={localize('com_ui_report_placeholder')}
                  className="mt-2 w-full resize-y rounded-xl border border-border-medium bg-surface-primary p-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-[var(--illini-orange)] focus:ring-1 focus:ring-[var(--illini-orange)]"
                />
                <div className="mt-1 flex justify-between text-xs text-text-tertiary">
                  <span>{localize('com_ui_report_activity_note')}</span>
                  <span>{description.length}/2000</span>
                </div>
              </div>
              {submit.isError && (
                <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
                  {localize('com_ui_report_error')}
                </p>
              )}
              <button
                type="button"
                disabled={description.trim().length < 10 || submit.isLoading}
                onClick={handleSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--illini-orange)] px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submit.isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {localize('com_ui_report_submit')}
              </button>
            </div>
          )}
        </OGDialogContent>
      </OGDialog>
    </>
  );
}
