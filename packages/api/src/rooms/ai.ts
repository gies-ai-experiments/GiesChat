import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import type { IAgent, IRoom, IRoomMessage, IRoomPoll } from '@librechat/data-schemas';

export const AI_MENTION_PATTERN: RegExp = /(^|[^\w.@-])@ai\b/i;
const TRANSCRIPT_MESSAGE_LIMIT = 30;
const CONTEXT_PROMPT_CAP = 20000;

export interface RoomPersona {
  instructions?: string;
  model?: string;
}

export interface ChatCompletionMessage {
  role: 'system' | 'user';
  content: string;
}

const DEFAULT_INSTRUCTIONS =
  'You are the AI collaborator in a shared GiesChat brainstorm room with multiple ' +
  'participants. Be concise and constructive: build on the ideas discussed, weigh ' +
  'trade-offs, and move the group forward. Messages are prefixed with the name of ' +
  'the participant who wrote them.';

export function detectAiMention(text: string): boolean {
  return AI_MENTION_PATTERN.test(text);
}

export async function getRoomPersona(agentId?: string): Promise<RoomPersona | null> {
  if (!agentId) {
    return null;
  }
  const Agent = mongoose.models.Agent as Model<IAgent>;
  const agent = await Agent.findOne({ id: agentId }).lean<IAgent>();
  if (!agent) {
    return null;
  }
  return { instructions: agent.instructions ?? undefined, model: agent.model };
}

const formatTranscript = (messages: IRoomMessage[]): string =>
  messages
    .slice(-TRANSCRIPT_MESSAGE_LIMIT)
    .filter((m) => m.kind !== 'system')
    .map((m) => `${m.authorName}: ${m.text}`)
    .join('\n');

export function buildRoomMessages(params: {
  room: Pick<IRoom, 'title' | 'contextText'>;
  persona: RoomPersona | null;
  history: IRoomMessage[];
  ragContext: string;
  authorName: string;
  question: string;
}): ChatCompletionMessage[] {
  const { room, persona, history, ragContext, authorName, question } = params;
  const sections = [persona?.instructions?.trim() || DEFAULT_INSTRUCTIONS];
  sections.push(`Room: ${room.title}`);
  if (room.contextText) {
    sections.push(`Background context shared with the room:\n${room.contextText.slice(0, CONTEXT_PROMPT_CAP)}`);
  }
  if (ragContext !== '') {
    sections.push(`Relevant excerpts from files attached to the room:\n${ragContext}`);
  }
  const transcript = formatTranscript(history);
  const userContent =
    (transcript === '' ? '' : `Discussion so far:\n${transcript}\n\n`) +
    `${authorName} asked: ${question}`;
  return [
    { role: 'system', content: sections.join('\n\n') },
    { role: 'user', content: userContent },
  ];
}

const formatPollResults = (polls: IRoomPoll[]): string =>
  polls
    .filter((p) => p.status === 'closed')
    .map((poll) => {
      const counts = poll.options.map((option, idx) => {
        let votes = 0;
        for (const choice of poll.votes.values()) {
          if (choice === idx) {
            votes += 1;
          }
        }
        return `${option}: ${votes}`;
      });
      return `Poll "${poll.question}" — ${counts.join(', ')}`;
    })
    .join('\n');

export function buildSummarizeMessages(params: {
  roomTitle: string;
  history: IRoomMessage[];
  polls: IRoomPoll[];
}): ChatCompletionMessage[] {
  const { roomTitle, history, polls } = params;
  const transcript = history
    .filter((m) => m.kind !== 'system')
    .map((m) => `${m.authorName}: ${m.text}`)
    .join('\n');
  const pollResults = formatPollResults(polls);
  const content =
    `Summarize this brainstorm discussion from the room "${roomTitle}".\n` +
    'Structure the recap as: Themes, Decisions (including poll results), Open questions.\n\n' +
    `Discussion:\n${transcript}` +
    (pollResults === '' ? '' : `\n\nClosed polls:\n${pollResults}`);
  return [
    {
      role: 'system',
      content:
        'You recap group brainstorm discussions concisely for students. Use short markdown sections.',
    },
    { role: 'user', content },
  ];
}
