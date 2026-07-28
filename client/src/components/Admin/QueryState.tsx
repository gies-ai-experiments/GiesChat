import React from 'react';
import { Button, Spinner } from '@librechat/client';
import type { TranslationKeys } from '~/hooks';
import { getResponseStatus } from '~/utils/errors';
import { useLocalize } from '~/hooks';

interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  isEmpty: boolean;
  /** Shown when the request succeeded but returned nothing. */
  emptyKey: TranslationKeys;
  /** Shown when the request failed for a reason other than a permission denial. */
  errorKey: TranslationKeys;
  onRetry?: () => void;
  children: React.ReactNode;
}

/**
 * Single source of truth for the four states every dashboard data view must handle:
 * loading, forbidden, error, and empty. Renders `children` only once there is data.
 */
export default function QueryState({
  isLoading,
  error,
  isEmpty,
  emptyKey,
  errorKey,
  onRetry,
  children,
}: QueryStateProps) {
  const localize = useLocalize();

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-2 py-10 text-text-secondary"
        role="status"
      >
        <Spinner className="size-5" />
        <span>{localize('com_ui_loading')}</span>
      </div>
    );
  }

  if (error != null) {
    const status = getResponseStatus(error);
    const isForbidden = status === 403 || status === 401;

    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl border border-border-light bg-surface-secondary px-4 py-10 text-center text-text-secondary"
        role="alert"
      >
        <p>{localize(isForbidden ? 'com_ui_admin_forbidden' : errorKey)}</p>
        {!isForbidden && onRetry != null && (
          <Button variant="outline" onClick={onRetry}>
            {localize('com_ui_retry')}
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <p
        className="rounded-xl border border-border-light bg-surface-secondary px-4 py-10 text-center text-text-secondary"
        role="status"
      >
        {localize(emptyKey)}
      </p>
    );
  }

  return <>{children}</>;
}
