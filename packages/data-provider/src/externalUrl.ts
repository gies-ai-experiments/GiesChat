export const EXTERNAL_URL_ALLOWED_HOSTS = ['replit.app', 'replit.dev', 'repl.co'];

/** Validates an external-url string before it reaches an iframe src. Returns the
 * normalized https href for allowed Replit hosts, otherwise null (fail closed). */
export function getAllowedExternalUrl(content: string | null | undefined): string | null {
  const trimmed = (content ?? '').trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') {
      return null;
    }
    const allowed = EXTERNAL_URL_ALLOWED_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
    return allowed ? url.href : null;
  } catch {
    return null;
  }
}
