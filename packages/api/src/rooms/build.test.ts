import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '@librechat/data-schemas';
import type { AppConfig, IRoomMessage, IRoomPoll } from '@librechat/data-schemas';
import type { ReplitToolCaller } from './build';
import type { FetchImpl } from './ai';
import {
  buildDraftMessages,
  draftBuildPrompt,
  extractReplId,
  extractPreviewUrl,
  isPausedResult,
  runAppBuild,
  isBuildLocked,
} from './build';
import { resetBroadcast } from './broadcast';

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
    expect(messages[1].content).toContain('Alerts');
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
      {
        name: 'Azure OpenAI',
        apiKey: 'k',
        baseURL: 'http://llm.test/v1',
        models: { default: ['gpt-5.4'] },
      },
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
    const fetchImpl: FetchImpl = async () =>
      sseResponse('  Build CampusPlate, a free-food alert app.  ');
    const draft = await draftBuildPrompt({ roomId: room.roomId, appConfig, fetchImpl });
    expect(draft).toBe('Build CampusPlate, a free-food alert app.');
  });
});

describe('extractReplId', () => {
  it('reads replId from JSON-ish tool text', () => {
    expect(extractReplId('{"replId":"abc-123","phase":"building"}')).toBe('abc-123');
    expect(extractReplId('replId: xyz_9 and more')).toBe('xyz_9');
    expect(extractReplId('no id here')).toBeNull();
  });
});

describe('extractPreviewUrl', () => {
  it('returns the first allowlisted replit url', () => {
    expect(extractPreviewUrl('live at https://campusplate-ash.replit.dev/ now')).toBe(
      'https://campusplate-ash.replit.dev/',
    );
    expect(extractPreviewUrl('workspace https://replit.com/@ash/x only')).toBeNull();
    expect(extractPreviewUrl('still building, no url')).toBeNull();
  });
});

describe('isPausedResult', () => {
  it('detects plan-mode / paused signals', () => {
    expect(isPausedResult('{"phase":"paused"}')).toBe(true);
    expect(isPausedResult('The agent is in Plan mode awaiting approval')).toBe(true);
    expect(isPausedResult('building now')).toBe(false);
  });
});

const appMessages = (roomId: string): Promise<IRoomMessage[]> =>
  mongoose.models.RoomMessage.find({ roomId }).sort({ createdAt: 1 }).lean<IRoomMessage[]>();

describe('runAppBuild', () => {
  let server2: MongoMemoryServer;
  beforeAll(async () => {
    server2 = await MongoMemoryServer.create();
    await mongoose.connect(server2.getUri());
    createModels(mongoose);
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await server2.stop();
  });
  beforeEach(() => resetBroadcast());

  const nap: (ms: number) => Promise<void> = async () => undefined;

  it('creates the app card when the preview url resolves', async () => {
    const { createRoom } = await import('./service');
    const uid = new mongoose.Types.ObjectId().toHexString();
    const room = await createRoom({ userId: uid, name: 'Ash', title: 'T' });
    const calls: string[] = [];
    const callTool: ReplitToolCaller = async (toolName) => {
      calls.push(toolName);
      if (toolName === 'create_app_from_prompt') {
        return '{"replId":"abc-1","phase":"building","replUrl":"https://replit.com/@ash/x"}';
      }
      return 'Build finished. Live at https://campusplate.replit.dev/';
    };
    await runAppBuild({
      roomId: room.roomId,
      ownerId: uid,
      ownerName: 'Ash',
      prompt: 'Build CampusPlate',
      stackType: 'react_website',
      callTool,
      opts: { pollIntervalMs: 0, maxPolls: 3, sleepImpl: nap },
    });
    const msgs = await appMessages(room.roomId);
    const app = msgs.find((m: { kind: string }) => m.kind === 'app');
    expect(app).toBeDefined();
    expect((app as { appUrl: string }).appUrl).toBe('https://campusplate.replit.dev/');
    expect(calls[0]).toBe('create_app_from_prompt');
    expect(isBuildLocked(room.roomId)).toBe(false);
  });

  it('posts an honest message and no app card when it times out', async () => {
    const { createRoom } = await import('./service');
    const uid = new mongoose.Types.ObjectId().toHexString();
    const room = await createRoom({ userId: uid, name: 'Ash', title: 'T' });
    const callTool: ReplitToolCaller = async (toolName) =>
      toolName === 'create_app_from_prompt' ? '{"replId":"abc-2"}' : 'still building, no url yet';
    await runAppBuild({
      roomId: room.roomId,
      ownerId: uid,
      ownerName: 'Ash',
      prompt: 'p',
      stackType: 'react_website',
      callTool,
      opts: { pollIntervalMs: 0, maxPolls: 2, sleepImpl: nap },
    });
    const msgs = await appMessages(room.roomId);
    expect(msgs.some((m: { kind: string }) => m.kind === 'app')).toBe(false);
    expect(
      msgs.some(
        (m: { kind: string; text: string }) =>
          m.kind === 'system' && /still building/i.test(m.text),
      ),
    ).toBe(true);
  });

  it('nudges once on plan-mode pause then reports honestly if still paused', async () => {
    const { createRoom } = await import('./service');
    const uid = new mongoose.Types.ObjectId().toHexString();
    const room = await createRoom({ userId: uid, name: 'Ash', title: 'T' });
    const asked: string[] = [];
    const callTool: ReplitToolCaller = async (toolName, args) => {
      if (toolName === 'create_app_from_prompt') return '{"replId":"abc-3"}';
      asked.push(String((args as { question?: string }).question ?? ''));
      return '{"phase":"paused"} Plan mode awaiting approval';
    };
    await runAppBuild({
      roomId: room.roomId,
      ownerId: uid,
      ownerName: 'Ash',
      prompt: 'p',
      stackType: 'react_website',
      callTool,
      opts: { pollIntervalMs: 0, maxPolls: 4, sleepImpl: nap },
    });
    expect(asked.some((q) => /approved|build mode/i.test(q))).toBe(true);
    const msgs = await appMessages(room.roomId);
    expect(msgs.some((m: { text: string }) => /paused|manual approval/i.test(m.text))).toBe(true);
  });

  it('surfaces the real Replit response when create returns no build id', async () => {
    const { createRoom } = await import('./service');
    const uid = new mongoose.Types.ObjectId().toHexString();
    const room = await createRoom({ userId: uid, name: 'Ash', title: 'T' });
    const callTool: ReplitToolCaller = async (toolName) =>
      toolName === 'create_app_from_prompt'
        ? '{"error":"invalid_argument","message":"unknown field: type"}'
        : 'no match';
    await runAppBuild({
      roomId: room.roomId,
      ownerId: uid,
      ownerName: 'Ash',
      prompt: 'p',
      stackType: 'react_website',
      callTool,
      opts: { pollIntervalMs: 0, maxPolls: 2, sleepImpl: nap },
    });
    const msgs = await appMessages(room.roomId);
    expect(msgs.some((m: { kind: string }) => m.kind === 'app')).toBe(false);
    expect(msgs.some((m: { text: string }) => /unknown field: type/.test(m.text))).toBe(true);
    expect(isBuildLocked(room.roomId)).toBe(false);
  });

  it('reports a friendly message when create fails', async () => {
    const { createRoom } = await import('./service');
    const uid = new mongoose.Types.ObjectId().toHexString();
    const room = await createRoom({ userId: uid, name: 'Ash', title: 'T' });
    const callTool: ReplitToolCaller = async () => {
      throw new Error('requires_active_subscription');
    };
    await runAppBuild({
      roomId: room.roomId,
      ownerId: uid,
      ownerName: 'Ash',
      prompt: 'p',
      stackType: 'react_website',
      callTool,
      opts: { pollIntervalMs: 0, maxPolls: 2, sleepImpl: nap },
    });
    const msgs = await appMessages(room.roomId);
    expect(msgs.some((m: { text: string }) => /Replit/i.test(m.text))).toBe(true);
    expect(isBuildLocked(room.roomId)).toBe(false);
  });
});
