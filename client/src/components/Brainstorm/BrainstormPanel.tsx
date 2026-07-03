import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { Copy, CopyCheck, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { Constants, PermissionTypes, Permissions } from 'librechat-data-provider';
import { useGetSharedLinkQuery } from 'librechat-data-provider/react-query';
import { Button, Spinner, useToastContext } from '@librechat/client';
import {
  useCreateSharedLinkMutation,
  useGetStartupConfig,
  useUpdateSharedLinkMutation,
} from '~/data-provider';
import { useCopyToClipboard, useHasAccess, useLocalize } from '~/hooks';
import { useLatestMessage } from '~/hooks/Messages/useLatestMessage';
import { NotificationSeverity } from '~/common';
import { buildShareLinkUrl, cn } from '~/utils';
import store from '~/store';

export default function BrainstormPanel() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const latestMessage = useLatestMessage(0);
  const { data: startupConfig } = useGetStartupConfig();
  const [inviteUrl, setInviteUrl] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const copyInvite = useCopyToClipboard({ text: inviteUrl });

  const conversationId = conversation?.conversationId ?? '';
  const canUseConversation =
    conversationId !== '' &&
    conversationId !== Constants.NEW_CONVO &&
    conversationId !== Constants.PENDING_CONVO &&
    conversationId !== 'search';

  const sharedLinksEnabled = startupConfig?.sharedLinksEnabled === true;
  const canSnapshotFiles = startupConfig?.sharedLinksSnapshotFilesEnabled === true;
  const canCreateSharedLinks = useHasAccess({
    permissionType: PermissionTypes.SHARED_LINKS,
    permission: Permissions.CREATE,
  });

  const { data: share, isLoading } = useGetSharedLinkQuery(conversationId, {
    enabled: canUseConversation && sharedLinksEnabled,
  });
  const shareId = share?.shareId ?? '';

  useEffect(() => {
    if (shareId) {
      setInviteUrl(buildShareLinkUrl(shareId));
    }
  }, [shareId]);

  const mutationOptions = {
    onError: () => {
      showToast({
        message: localize('com_ui_share_error'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  };

  const createSharedLink = useCreateSharedLinkMutation(mutationOptions);
  const updateSharedLink = useUpdateSharedLinkMutation(mutationOptions);

  const isSaving = createSharedLink.isLoading || updateSharedLink.isLoading;

  const handleStartBrainstorm = async () => {
    if (!canUseConversation || !sharedLinksEnabled || !canCreateSharedLinks) {
      return;
    }

    const targetMessageId = latestMessage?.messageId ?? undefined;
    const snapshotFiles = canSnapshotFiles ? true : undefined;
    const nextShare = shareId
      ? await updateSharedLink.mutateAsync({ shareId, targetMessageId, snapshotFiles })
      : await createSharedLink.mutateAsync({ conversationId, targetMessageId, snapshotFiles });

    setInviteUrl(buildShareLinkUrl(nextShare.shareId));
  };

  const copyDisabled = inviteUrl === '' || isCopying;
  const startDisabled =
    !canUseConversation || !sharedLinksEnabled || !canCreateSharedLinks || isLoading || isSaving;
  const startLabel = shareId
    ? localize('com_ui_brainstorm_refresh')
    : localize('com_ui_brainstorm_start');
  const startIcon = shareId ? (
    <RefreshCw className="size-4" aria-hidden="true" />
  ) : (
    <Sparkles className="size-4" aria-hidden="true" />
  );

  let helperText = localize('com_ui_brainstorm_description');
  if (!sharedLinksEnabled) {
    helperText = localize('com_ui_brainstorm_share_disabled');
  } else if (!canCreateSharedLinks) {
    helperText = localize('com_ui_brainstorm_permission_disabled');
  } else if (!canUseConversation) {
    helperText = localize('com_ui_brainstorm_no_chat');
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-surface-primary-alt px-4 py-5 text-text-primary">
      <div className="flex items-start gap-3 border-b border-border-light pb-4">
        <div className="rounded-2xl bg-surface-active-alt p-2 text-text-primary">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{localize('com_ui_brainstorm')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{helperText}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border-light bg-surface-primary p-4 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {localize('com_ui_brainstorm_current_chat')}
        </div>
        <div className="mt-2 line-clamp-2 text-base font-medium">
          {canUseConversation
            ? conversation?.title || localize('com_ui_new_chat')
            : localize('com_ui_new_chat')}
        </div>
        <Button
          variant="submit"
          className="mt-4 w-full justify-center gap-2"
          disabled={startDisabled}
          onClick={handleStartBrainstorm}
        >
          {isSaving ? <Spinner className="size-4" /> : startIcon}
          {startLabel}
        </Button>
      </div>

      {inviteUrl && (
        <div className="mt-4 rounded-2xl border border-border-light bg-surface-primary p-4 shadow-sm">
          <div className="text-sm font-semibold">{localize('com_ui_brainstorm_invite')}</div>
          <p className="mt-1 text-sm text-text-secondary">
            {localize('com_ui_brainstorm_join_hint')}
          </p>
          <div className="mt-3 break-all rounded-xl bg-surface-secondary p-3 text-sm text-text-secondary">
            {inviteUrl}
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className={cn('flex-1 gap-2', copyDisabled ? 'cursor-default' : '')}
              disabled={copyDisabled}
              onClick={() => copyInvite(setIsCopying)}
            >
              {isCopying ? (
                <CopyCheck className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {localize('com_ui_copy_link')}
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <a href={inviteUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                {localize('com_ui_open')}
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
