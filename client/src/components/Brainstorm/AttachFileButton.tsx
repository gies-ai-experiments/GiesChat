import { useRef } from 'react';
import { v4 } from 'uuid';
import { Paperclip } from 'lucide-react';
import { EModelEndpoint } from 'librechat-data-provider';
import { Button, Spinner, useToastContext } from '@librechat/client';
import { useUploadFileMutation, useAttachRoomFileMutation } from '~/data-provider';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';

export default function AttachFileButton({
  roomId,
  disabled,
}: {
  roomId: string;
  disabled: boolean;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const attachFile = useAttachRoomFileMutation(roomId);

  const showError = () =>
    showToast({
      message: localize('com_ui_brainstorm_attach_error'),
      severity: NotificationSeverity.ERROR,
      showIcon: true,
    });

  const uploadFile = useUploadFileMutation({
    onSuccess: (data) => attachFile.mutate(data.file_id, { onError: showError }),
    onError: showError,
  });

  const onFileSelected = (file: File | undefined) => {
    if (!file) {
      return;
    }
    const formData = new FormData();
    formData.append('endpoint', EModelEndpoint.agents);
    formData.append('file', file, encodeURIComponent(file.name));
    formData.append('file_id', v4());
    formData.append('message_file', 'true');
    formData.append('tool_resource', 'file_search');
    uploadFile.mutate(formData);
  };

  const isBusy = uploadFile.isLoading || attachFile.isLoading;

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        onChange={(e) => {
          onFileSelected(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <Button
        variant="outline"
        size="icon"
        disabled={disabled || isBusy}
        onClick={() => inputRef.current?.click()}
        aria-label={localize('com_ui_brainstorm_attach')}
      >
        {isBusy ? (
          <Spinner className="size-4" />
        ) : (
          <Paperclip className="size-4" aria-hidden="true" />
        )}
      </Button>
    </>
  );
}
