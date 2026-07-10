import type { TransformableInfo } from 'logform';

export type DiagnosticLogEntry = {
  timestamp: string;
  level: string;
  message: string;
  userId?: string;
  tenantId?: string;
  requestId?: string;
};

const MAX_ENTRIES = 500;
const MAX_AGE_MS = 15 * 60 * 1000;
const entries: DiagnosticLogEntry[] = [];

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export function captureDiagnosticLog(info: TransformableInfo): void {
  // eslint-disable-next-line no-control-regex
  const level = asString(info.level)?.replace(/\u001b\[[0-9;]*m/g, '') ?? '';
  if (level !== 'warn' && level !== 'error') {
    return;
  }
  entries.push({
    timestamp: new Date().toISOString(),
    level,
    message: String(info.message ?? '').slice(0, 1000),
    userId: asString(info.userId),
    tenantId: asString(info.tenantId),
    requestId: asString(info.requestId),
  });
  const cutoff = Date.now() - MAX_AGE_MS;
  while (entries.length > MAX_ENTRIES || Date.parse(entries[0]?.timestamp ?? '') < cutoff) {
    entries.shift();
  }
}

export function getRecentDiagnosticLogs(input: {
  userId: string;
  tenantId?: string;
  since: Date;
  limit?: number;
}): DiagnosticLogEntry[] {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  return entries
    .filter(
      (entry) =>
        entry.userId === input.userId &&
        (!input.tenantId || !entry.tenantId || entry.tenantId === input.tenantId) &&
        Date.parse(entry.timestamp) >= input.since.getTime(),
    )
    .slice(-limit);
}
