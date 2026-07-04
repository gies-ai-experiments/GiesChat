import { FileText, X } from 'lucide-react';
import type { TFile } from 'librechat-data-provider';
import { useDetachRoomFileMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

export default function FilesRow({
  roomId,
  files,
  isOwner,
}: {
  roomId: string;
  files: TFile[];
  isOwner: boolean;
}) {
  const localize = useLocalize();
  const detachFile = useDetachRoomFileMutation(roomId);

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-light px-4 py-2">
      {files.map((file) => (
        <span
          key={file.file_id}
          className="flex items-center gap-1.5 rounded-full border border-border-light bg-surface-primary px-3 py-1 text-xs"
        >
          <FileText className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="max-w-40 truncate">{file.filename}</span>
          {isOwner && (
            <button
              type="button"
              className="text-text-secondary hover:text-text-primary"
              disabled={detachFile.isLoading}
              onClick={() => detachFile.mutate(file.file_id)}
              aria-label={localize('com_ui_brainstorm_remove_file')}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
