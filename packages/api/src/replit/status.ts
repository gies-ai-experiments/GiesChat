import { PREVIEW_QUESTION, extractPreviewUrl, isToolError } from '../rooms/build';
import type { ReplitToolCaller } from '../rooms/build';

const REPL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{5,63}$/;

export type TReplitBuildState = 'building' | 'ready' | 'error';

export interface ReplitBuildStatusResult {
  status: TReplitBuildState;
  url?: string;
  detail?: string;
}

export function isValidReplId(replId: string): boolean {
  return REPL_ID_RE.test(replId);
}

const DEFAULT_TOOL_TIMEOUT_MS = 20_000;
const TIMED_OUT = Symbol('replit-status-timeout');

export async function checkBuildStatus(params: {
  callTool: ReplitToolCaller;
  replId: string;
  timeoutMs?: number;
}): Promise<ReplitBuildStatusResult> {
  const { callTool, replId, timeoutMs = DEFAULT_TOOL_TIMEOUT_MS } = params;
  if (!isValidReplId(replId)) {
    return { status: 'error', detail: 'invalid_repl_id' };
  }

  /* callTool can hang for minutes when the user has no Replit connection
   * (the MCP manager waits on an OAuth flow) — race it so every poll
   * request gets a prompt answer and reports "building" instead. */
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
  });

  let text: string;
  try {
    const raced = await Promise.race([
      callTool('ask_question', { replId, question: PREVIEW_QUESTION }),
      timeout,
    ]);
    if (raced === TIMED_OUT) {
      return { status: 'building', detail: 'tool_timeout' };
    }
    text = raced;
  } catch {
    return { status: 'error', detail: 'tool_call_failed' };
  } finally {
    clearTimeout(timer);
  }

  const url = extractPreviewUrl(text);
  if (url != null) {
    return { status: 'ready', url };
  }
  if (isToolError(text)) {
    return { status: 'error', detail: 'tool_error' };
  }
  return { status: 'building' };
}
