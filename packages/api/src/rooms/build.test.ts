import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '@librechat/data-schemas';
import type { AppConfig, IRoomMessage, IRoomPoll } from '@librechat/data-schemas';
import { buildDraftMessages, draftBuildPrompt } from './build';
import type { FetchImpl } from './ai';

const msg = (authorName: string, text: string, kind: IRoomMessage['kind'] = 'user') =>
  ({ authorName, text, kind }) as IRoomMessage;

describe('buildDraftMessages', () => {
  it('includes the transcript, context, and closed-poll winner', () => {
    const polls = [
      {
        question: 'Which idea?',
        options: ['Alerts', 'Compost'],
        status: 'closed',
        votes: { a: 0, b: 0, c: 0, d: 1 },
      },
    ] as unknown as IRoomPoll[];
    const messages = buildDraftMessages({
      roomTitle: 'Food Waste',
      contextText: 'reduce campus food waste',
      history: [msg('Sam', 'free food alerts'), msg('System', 'joined', 'system')],
      polls,
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content.toLowerCase()).toContain('app');
    expect(messages[1].content).toContain('Food Waste');
    expect(messages[1].content).toContain('reduce campus food waste');
    expect(messages[1].content).toContain('Sam: free food alerts');
    expect(messages[1].content).not.toContain('joined');
  });
});

const sseResponse = (text: string): Response => {
  const chunk = { choices: [{ delta: { content: text } }] };
  const body = `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`;
  return new Response(body, { status: 200 });
};
const appConfig = {
  endpoints: {
    custom: [
      { name: 'Azure OpenAI', apiKey: 'k', baseURL: 'http://llm.test/v1', models: { default: ['gpt-5.4'] } },
    ],
  },
} as unknown as AppConfig;

describe('draftBuildPrompt', () => {
  let server: MongoMemoryServer;
  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    await mongoose.connect(server.getUri());
    createModels(mongoose);
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await server.stop();
  });

  it('returns the trimmed LLM draft', async () => {
    const { createRoom, postMessage } = await import('./service');
    const uid = new mongoose.Types.ObjectId().toHexString();
    const room = await createRoom({ userId: uid, name: 'Ash', title: 'Food Waste' });
    await postMessage({ roomId: room.roomId, userId: uid, name: 'Ash', text: 'free food alerts' });
    const fetchImpl: FetchImpl = async () => sseResponse('  Build CampusPlate, a free-food alert app.  ');
    const draft = await draftBuildPrompt({ roomId: room.roomId, appConfig, fetchImpl });
    expect(draft).toBe('Build CampusPlate, a free-food alert app.');
  });
});
