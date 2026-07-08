import { getAllowedExternalUrl } from 'librechat-data-provider';
import type { TRoomMessage } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';

export default function AppCard({ message }: { message: TRoomMessage }) {
  const localize = useLocalize();
  const url = getAllowedExternalUrl(message.appUrl);
  if (!url) {
    return null;
  }
  return (
    <div className="my-2 rounded-lg border border-l-[3px] border-[#E5E7EB] border-l-[#FF5F05] bg-white p-3 dark:border-border-light dark:bg-surface-primary">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-[#FF5F05] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          {localize('com_ui_brainstorm_build_app')}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-[12.5px] font-semibold text-[#13294B] hover:underline dark:text-text-primary"
        >
          {localize('com_ui_brainstorm_build_open')} ↗
        </a>
      </div>
      <iframe
        title={localize('com_ui_brainstorm_build_preview_title')}
        src={url}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        className="h-[320px] w-full rounded-md border border-[#E5E7EB] bg-white dark:border-border-light"
      />
    </div>
  );
}
