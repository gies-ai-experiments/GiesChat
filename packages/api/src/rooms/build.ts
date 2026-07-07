import type { AppConfig, IRoomMessage, IRoomPoll } from '@librechat/data-schemas';
import type { ChatCompletionMessage, FetchImpl } from './ai';
import { resolveRoomEndpoint, streamChatCompletion, countVotes, voteChoices } from './ai';
import { getRoom, getRecentMessages, getClosedPolls } from './service';

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
