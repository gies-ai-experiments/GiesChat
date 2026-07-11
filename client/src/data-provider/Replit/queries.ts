import { useEffect, useState } from 'react';
import { dataService } from 'librechat-data-provider';
import type { TReplitBuildStatus } from 'librechat-data-provider';

const POLL_INTERVAL_MS = 15_000;
const MAX_POLL_MS = 12 * 60_000;

/** Polls the build-status endpoint until the app is ready or the window
 * expires. A plain timer loop (not react-query) so the cadence is immune
 * to global cache/staleTime config. */
export function useReplitBuildStatus(replId: string, startedAt: number) {
  const [data, setData] = useState<TReplitBuildStatus | undefined>();

  useEffect(() => {
    if (replId.length === 0) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      if (!cancelled && Date.now() - startedAt < MAX_POLL_MS) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    const tick = async () => {
      try {
        const result = await dataService.getReplitBuildStatus(replId);
        if (cancelled) {
          return;
        }
        setData(result);
        if (result.status !== 'ready') {
          schedule();
        }
      } catch {
        schedule();
      }
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [replId, startedAt]);

  return data;
}
