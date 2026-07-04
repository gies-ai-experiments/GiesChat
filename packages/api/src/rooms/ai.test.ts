import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '@librechat/data-schemas';
import type { IRoomMessage, IRoomPoll } from '@librechat/data-schemas';
import {
  detectAiMention,
  getRoomPersona,
  buildRoomMessages,
  buildSummarizeMessages,
} from './ai';

const msg = (authorName: string, text: string, kind: IRoomMessage['kind'] = 'user') =>
  ({ authorName, text, kind }) as IRoomMessage;

describe('detectAiMention', () => {
  it.each([
    ['@ai what do you think?', true],
    ['hey @AI!', true],
    ['thanks @Ai', true],
    ['(@ai can you help)', true],
    ['contact x@ai.com', false],
    ['@aid is not a mention', false],
    ['plain message', false],
    ['email me@ai', false],
  ])('%s → %s', (text, expected) => {
    expect(detectAiMention(text)).toBe(expected);
  });
});

describe('buildRoomMessages', () => {
  const room = { title: 'BADM 350', contextText: 'seeded chat transcript' };

  it('uses default instructions, room title, context, and transcript', () => {
    const messages = buildRoomMessages({
      room,
      persona: null,
      history: [msg('Ash', 'first idea'), msg('System', 'Sam joined', 'system')],
      ragContext: '',
      authorName: 'Sam',
      question: '@ai evaluate this',
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('AI collaborator');
    expect(messages[0].content).toContain('Room: BADM 350');
    expect(messages[0].content).toContain('seeded chat transcript');
    expect(messages[1].content).toContain('Ash: first idea');
    expect(messages[1].content).not.toContain('Sam joined');
    expect(messages[1].content).toContain('Sam asked: @ai evaluate this');
  });

  it('prefers persona instructions and includes rag context', () => {
    const messages = buildRoomMessages({
      room: { title: 'X' },
      persona: { instructions: 'You are the BADM 350 tutor.' },
      history: [],
      ragContext: 'chunk one\nchunk two',
      authorName: 'Ash',
      question: 'help',
    });
    expect(messages[0].content).toContain('You are the BADM 350 tutor.');
    expect(messages[0].content).not.toContain('AI collaborator');
    expect(messages[0].content).toContain('chunk one');
  });

  it('caps transcript at the last 30 non-system messages', () => {
    const history = Array.from({ length: 40 }, (_, i) => msg('U', `m${i}`));
    const messages = buildRoomMessages({
      room: { title: 'X' },
      persona: null,
      history,
      ragContext: '',
      authorName: 'A',
      question: 'q',
    });
    expect(messages[1].content).not.toContain('m9\n');
    expect(messages[1].content).toContain('m10');
    expect(messages[1].content).toContain('m39');
  });
});

describe('buildSummarizeMessages', () => {
  it('includes transcript and closed poll tallies', () => {
    const polls = [
      {
        question: 'Pick a topic',
        options: ['A', 'B'],
        status: 'closed',
        votes: new Map([
          ['u1', 0],
          ['u2', 1],
          ['u3', 1],
        ]),
      } as unknown as IRoomPoll,
      {
        question: 'Still open',
        options: ['X'],
        status: 'open',
        votes: new Map(),
      } as unknown as IRoomPoll,
    ];
    const messages = buildSummarizeMessages({
      roomTitle: 'Sprint',
      history: [msg('Ash', 'idea one')],
      polls,
    });
    expect(messages[1].content).toContain('Ash: idea one');
    expect(messages[1].content).toContain('Poll "Pick a topic" — A: 1, B: 2');
    expect(messages[1].content).not.toContain('Still open');
  });
});

describe('getRoomPersona', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    createModels(mongoose);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('returns null without an agentId or for unknown agents', async () => {
    expect(await getRoomPersona(undefined)).toBeNull();
    expect(await getRoomPersona('agent_missing')).toBeNull();
  });

  it('returns instructions and model for a real agent', async () => {
    await mongoose.models.Agent.create({
      id: 'agent_tutor',
      name: 'BADM Tutor',
      provider: 'Azure OpenAI',
      model: 'gpt-5.4',
      instructions: 'Be Socratic.',
      author: new mongoose.Types.ObjectId(),
    });
    expect(await getRoomPersona('agent_tutor')).toEqual({
      instructions: 'Be Socratic.',
      model: 'gpt-5.4',
    });
  });
});
