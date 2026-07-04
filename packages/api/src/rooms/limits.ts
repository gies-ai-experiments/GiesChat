/* ponytail: in-memory sliding windows, reset on restart; Redis if multi-instance */
const buckets = new Map<string, number[]>();

export interface RateLimitRule {
  max: number;
  windowMs: number;
}

export const ROOM_CREATE_LIMIT: RateLimitRule = { max: 5, windowMs: 10 * 60 * 1000 };
export const ROOM_MESSAGE_LIMIT: RateLimitRule = { max: 60, windowMs: 60 * 1000 };
export const ROOM_SUMMARIZE_LIMIT: RateLimitRule = { max: 3, windowMs: 5 * 60 * 1000 };

export function checkLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function resetLimits(): void {
  buckets.clear();
}
