import { getAllowedExternalUrl } from 'librechat-data-provider';
import type { AppConfig, IRoomMessage, IRoomPoll } from '@librechat/data-schemas';
import type { ChatCompletionMessage, FetchImpl } from './ai';
import {
  getRoom,
  getRecentMessages,
  getClosedPolls,
  postSystemMessage,
  createAppMessage,
} from './service';
import { resolveRoomEndpoint, streamChatCompletion, countVotes, voteChoices } from './ai';
import { publish } from './broadcast';

const DRAFT_HISTORY_LIMIT = 200;
const DRAFT_CONTEXT_CAP = 8000;

const DRAFT_SYSTEM =
  'You turn a group brainstorm discussion into a single, concrete build prompt for an ' +
  'app-generation agent. Output ONLY the prompt: one paragraph describing the app to build — ' +
  'its purpose, the core features the group agreed on, and any stack or styling preferences ' +
  'they mentioned. No preamble, no bullet lists, no questions.';

const winningOption = (poll: IRoomPoll): string | null => {
  if (voteChoices(poll.votes).length === 0) {
    return null;
  }
  const counts = countVotes(poll);
  let best = 0;
  for (let i = 1; i < counts.length; i += 1) {
    if (counts[i] > counts[best]) {
      best = i;
    }
  }
  return poll.options[best] ?? null;
};

export function buildDraftMessages(params: {
  roomTitle: string;
  contextText?: string;
  history: IRoomMessage[];
  polls: IRoomPoll[];
}): ChatCompletionMessage[] {
  const { roomTitle, contextText, history, polls } = params;
  const transcript = history
    .filter((m) => m.kind !== 'system')
    .map((m) => `${m.authorName}: ${m.text}`)
    .join('\n');
  const decided = polls
    .filter((p) => p.status === 'closed')
    .map((p) => winningOption(p))
    .filter((o): o is string => o !== null);
  const sections = [`Room: ${roomTitle}`];
  if (contextText) {
    sections.push(`Goal shared with the room:\n${contextText.slice(0, DRAFT_CONTEXT_CAP)}`);
  }
  if (decided.length > 0) {
    sections.push(`The group voted for: ${decided.join(', ')}`);
  }
  sections.push(`Discussion:\n${transcript}`);
  sections.push('Write the build prompt for the app this group wants.');
  return [
    { role: 'system', content: DRAFT_SYSTEM },
    { role: 'user', content: sections.join('\n\n') },
  ];
}

export async function draftBuildPrompt(params: {
  roomId: string;
  appConfig: AppConfig;
  fetchImpl?: FetchImpl;
}): Promise<string> {
  const { roomId, appConfig, fetchImpl } = params;
  const endpoint = resolveRoomEndpoint(appConfig);
  if (!endpoint) {
    throw new Error('room AI endpoint is not configured');
  }
  const room = await getRoom(roomId);
  const history = await getRecentMessages(roomId, DRAFT_HISTORY_LIMIT);
  const polls = await getClosedPolls(roomId);
  const messages = buildDraftMessages({
    roomTitle: room.title,
    contextText: room.contextText,
    history,
    polls,
  });
  const text = await streamChatCompletion({
    endpoint,
    model: endpoint.defaultModel,
    messages,
    fetchImpl,
    onDelta: () => undefined,
  });
  return text.trim();
}

const REPL_ID_RE = /"?repl_?id"?\s*[:=]\s*"?([A-Za-z0-9._-]+)"?/i;
const URL_RE = /https?:\/\/[^\s"'<>)]+/g;
const PAUSED_RE =
  /\b(plan mode|paused|awaiting approval|waiting for approval)\b|"phase"\s*:\s*"paused"/i;

export function extractReplId(toolText: string): string | null {
  const match = toolText.match(REPL_ID_RE);
  return match ? match[1] : null;
}

export function extractPreviewUrl(toolText: string): string | null {
  const candidates = toolText.match(URL_RE) ?? [];
  for (const candidate of candidates) {
    const allowed = getAllowedExternalUrl(candidate);
    if (allowed) {
      return allowed;
    }
  }
  return null;
}

export function isPausedResult(toolText: string): boolean {
  return PAUSED_RE.test(toolText);
}

export type ReplitToolCaller = (toolName: string, args: Record<string, unknown>) => Promise<string>;

export interface BuildLoopOptions {
  pollIntervalMs?: number;
  maxPolls?: number;
  sleepImpl?: (ms: number) => Promise<void>;
}

const DEFAULT_POLL_INTERVAL_MS = 45_000;
const DEFAULT_MAX_POLLS = 16;
const realSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ponytail: in-memory lock, single-container only (same ceiling as the SSE
// broadcast registry); move to Redis if rooms ever run multi-instance.
const buildLocks = new Set<string>();
export const isBuildLocked = (roomId: string): boolean => buildLocks.has(roomId);
export const releaseBuildLock = (roomId: string): void => {
  buildLocks.delete(roomId);
};

const PREVIEW_QUESTION =
  'Is the initial build finished? What is the live preview URL of this app — the ' +
  'https://....replit.dev URL where the running app can be viewed? Reply with the build ' +
  'status and the exact URL.';
const APPROVE_QUESTION =
  'The plan is approved. Please switch to Build mode and start building the app now.';

const say = async (roomId: string, text: string): Promise<void> => {
  const note = await postSystemMessage(roomId, text);
  publish(roomId, 'message', note);
};

export async function runAppBuild(params: {
  roomId: string;
  ownerId: string;
  ownerName: string;
  prompt: string;
  stackType: string;
  callTool: ReplitToolCaller;
  opts?: BuildLoopOptions;
}): Promise<void> {
  const { roomId, ownerId, ownerName, prompt, stackType, callTool } = params;
  const pollIntervalMs = params.opts?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxPolls = params.opts?.maxPolls ?? DEFAULT_MAX_POLLS;
  const sleep = params.opts?.sleepImpl ?? realSleep;
  buildLocks.add(roomId);
  try {
    await say(roomId, `${ownerName} started building an app from this discussion…`);

    let created: string;
    try {
      created = await callTool('create_app_from_prompt', { prompt, type: stackType });
    } catch (error) {
      await say(
        roomId,
        `Replit couldn't start the build: ${String((error as Error).message)}. ` +
          `Check your Replit account (you may be out of Agent credits or app slots) and try again.`,
      );
      return;
    }

    let replId = extractReplId(created);
    if (!replId) {
      try {
        const resolved = await callTool('resolve_app_by_name', { name: prompt.slice(0, 60) });
        replId = extractReplId(resolved);
      } catch {
        replId = null;
      }
    }
    if (!replId) {
      const detail = created.trim().slice(0, 800);
      await say(
        roomId,
        'The app could not be created on Replit — no build id came back. ' +
          `Replit's response was:\n\n${detail || '(empty response)'}`,
      );
      return;
    }

    await say(
      roomId,
      `App created on ${ownerName}'s Replit account — building now (usually a few minutes).`,
    );

    let nudged = false;
    for (let i = 0; i < maxPolls; i += 1) {
      await sleep(pollIntervalMs);
      const status = await callTool('ask_question', { replId, question: PREVIEW_QUESTION });
      const url = extractPreviewUrl(status);
      if (url) {
        await createAppMessage(roomId, `The app is live: ${url}`, url, ownerId, ownerName).then(
          (msg) => publish(roomId, 'message', msg),
        );
        return;
      }
      if (isPausedResult(status) && !nudged) {
        nudged = true;
        await callTool('ask_question', { replId, question: APPROVE_QUESTION });
        const recheck = await callTool('ask_question', { replId, question: PREVIEW_QUESTION });
        const recheckUrl = extractPreviewUrl(recheck);
        if (recheckUrl) {
          await createAppMessage(
            roomId,
            `The app is live: ${recheckUrl}`,
            recheckUrl,
            ownerId,
            ownerName,
          ).then((msg) => publish(roomId, 'message', msg));
          return;
        }
        if (isPausedResult(recheck)) {
          await say(
            roomId,
            'Replit paused this build for manual approval and I could not resume it automatically. ' +
              `${ownerName} can switch it from Plan to Build mode in Replit, or add Agent credits.`,
          );
          return;
        }
      }
    }

    await say(
      roomId,
      `The app is still building on ${ownerName}'s Replit account — check replit.com in a few minutes. ` +
        'Clicking Build again starts a new app and spends more credits.',
    );
  } catch {
    await say(
      roomId,
      'The build was interrupted. Check your Replit account, then try again.',
    ).catch(() => undefined);
  } finally {
    releaseBuildLock(roomId);
  }
}
