import { FileText, X } from 'lucide-react';
import type { TFile } from 'librechat-data-provider';
import { useDetachRoomFileMutation } from '~/data-provider';
import AttachFileButton from './AttachFileButton';
import { useLocalize } from '~/hooks';

function RemoveButton({
  fileId,
  roomId,
  className,
}: {
  fileId: string;
  roomId: string;
  className?: string;
}) {
  const localize = useLocalize();
  const detachFile = useDetachRoomFileMutation(roomId);
  return (
    <button
      type="button"
      className={className}
      disabled={detachFile.isLoading}
      onClick={() => detachFile.mutate(fileId)}
      aria-label={localize('com_ui_brainstorm_remove_file')}
    >
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );
}

export function FilesPanel({
  roomId,
  files,
  isOwner,
}: {
  roomId: string;
  files: TFile[];
  isOwner: boolean;
}) {
  const localize = useLocalize();
  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.05em] text-[#6B7280] dark:text-text-secondary">
        {localize('com_ui_brainstorm_files')}
      </h2>
      <ul className="min-h-0 flex-1">
        {files.map((file) => (
          <li key={file.file_id} className="flex items-center gap-2 py-1.5 text-[13px]">
            <FileText
              className="size-3.5 shrink-0 text-[#6B7280] dark:text-text-secondary"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{file.filename}</span>
            {isOwner && (
              <RemoveButton
                fileId={file.file_id}
                roomId={roomId}
                className="shrink-0 text-[#6B7280] hover:text-[#991B1B] dark:text-text-secondary"
              />
            )}
          </li>
        ))}
        {files.length === 0 && (
          <li className="py-2 text-[13px] text-[#6B7280] dark:text-text-secondary">
            {localize('com_ui_brainstorm_files_empty')}
          </li>
        )}
      </ul>
      <AttachFileButton roomId={roomId} disabled={false} withLabel={true} />
    </div>
  );
}

export default function FilesRow({
  roomId,
  files,
  isOwner,
}: {
  roomId: string;
  files: TFile[];
  isOwner: boolean;
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] bg-white px-4 py-2 dark:border-border-light dark:bg-surface-primary">
      {files.map((file) => (
        <span
          key={file.file_id}
          className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs dark:border-border-light dark:bg-surface-primary"
        >
          <FileText className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="max-w-40 truncate">{file.filename}</span>
          {isOwner && (
            <RemoveButton
              fileId={file.file_id}
              roomId={roomId}
              className="text-text-secondary hover:text-text-primary"
            />
          )}
        </span>
      ))}
    </div>
  );
}
