import { useEffect } from 'react';
import { CheckCircle2, ExternalLink, Loader2, X } from 'lucide-react';
import { useRecoilState } from 'recoil';
import store from '~/store';

export default function ReplitBuildPopup() {
  const [notification, setNotification] = useRecoilState(store.replitBuildNotification);

  useEffect(() => {
    if (!notification || notification.status !== 'ready') {
      return;
    }
    const timeout = window.setTimeout(() => setNotification(null), 9000);
    return () => window.clearTimeout(timeout);
  }, [notification, setNotification]);

  if (!notification) {
    return null;
  }

  const isReady = notification.status === 'ready';

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto absolute bottom-24 right-4 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border-light bg-surface-primary p-4 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-surface-secondary p-2">
          {isReady ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-text-primary">
            {isReady ? 'Your Replit app is ready' : 'Replit is building your app'}
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            {isReady
              ? 'The live app preview opened in the artifact panel.'
              : 'This usually takes a few minutes. I will open the app automatically when the preview URL is available.'}
          </div>
          {isReady && notification.previewUrl && (
            <a
              href={notification.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-500 hover:underline"
            >
              Open in new tab
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
        <button
          type="button"
          className="rounded-full p-1 text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Dismiss Replit app status"
          onClick={() => setNotification(null)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
