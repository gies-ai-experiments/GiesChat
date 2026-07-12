import { TOUR_REPLAY_EVENT } from '~/components/Tour';

const isLocalHostname = () => ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

export default function LocalTourButton({ isLocal = isLocalHostname() }: { isLocal?: boolean }) {
  if (!isLocal) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Show walkthrough"
      title="Show walkthrough"
      onClick={() => window.dispatchEvent(new Event(TOUR_REPLAY_EVENT))}
      className="h-9 shrink-0 rounded-xl border border-[var(--illini-orange)] px-3 text-sm font-semibold text-text-primary transition-colors hover:bg-[var(--illini-orange)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--illini-orange)]"
    >
      Show walkthrough
    </button>
  );
}
