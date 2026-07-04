import { PassThrough } from 'stream';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '@librechat/data-schemas';
import type { ServerResponse } from 'http';
import type { AppConfig, IRoomMessage } from '@librechat/data-schemas';
import { runAiReply, summarizeRoom, resolveRoomEndpoint } from './ai';
import { subscribe, resetBroadcast } from './broadcast';
import { createRoom, postMessage } from './service';
import type { FetchImpl } from './ai';

let mongoServer: MongoMemoryServer;
const userId = new mongoose.Types.ObjectId().toHexString();

const appConfig = {
  endpoints: {
    custom: [
      {
        name: 'Azure OpenAI',
        apiKey: 'test-key',
        baseURL: 'http://llm.test/v1',
        models: { default: ['gpt-5.4'] },
      },
    ],
  },
} as unknown as AppConfig;

function sseResponse(deltas: string[], { failAfter }: { failAfter?: number } = {}): Response {
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (failAfter !== undefined && i >= failAfter) {
        controller.error(new Error('stream died'));
        return;
      }
      if (i >= deltas.length) {
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
        return;
      }
      const chunk = { choices: [{ delta: { content: deltas[i] } }] };
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
      i += 1;
    },
  });
  return new Response(stream, { status: 200 });
}

const fetchWith =
  (factory: () => Response): FetchImpl =>
  async () =>
    factory();

function fakeListener(roomId: string) {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (c: Buffer) => chunks.push(c));
  (stream as unknown as { writeHead: () => unknown }).writeHead = () => stream;
  subscribe(roomId, 'listener', stream as unknown as ServerResponse);
  return { read: () => Buffer.concat(chunks).toString() };
}

const getMessages = async (roomId: string): Promise<IRoomMessage[]> =>
  mongoose.models.RoomMessage.find({ roomId }).sort({ createdAt: 1 }).lean();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  createModels(mongoose);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => resetBroadcast());

describe('resolveRoomEndpoint', () => {
  it('resolves the Azure OpenAI custom endpoint', () => {
    expect(resolveRoomEndpoint(appConfig)).toEqual({
      baseURL: 'http://llm.test/v1',
      apiKey: 'test-key',
      defaultModel: 'gpt-5.4',
    });
  });

  it('returns null when unconfigured', () => {
    expect(resolveRoomEndpoint({ endpoints: {} } as unknown as AppConfig)).toBeNull();
  });
});

describe('runAiReply', () => {
  it('streams deltas to the room and persists the final text', async () => {
    const room = await createRoom({ userId, name: 'Ash', title: 'AI room' });
    await postMessage({ roomId: room.roomId, userId, name: 'Ash', text: '@ai hello' });
    const listener = fakeListener(room.roomId);

    await runAiReply({
      roomId: room.roomId,
      appConfig,
      authorName: 'Ash',
      question: '@ai hello',
      userId,
      fetchImpl: fetchWith(() => sseResponse(['Hel', 'lo ', 'room'])),
    });

    const frames = listener.read();
    expect(frames).toContain('event: ai_delta');
    expect(frames).toContain('"delta":"Hel"');
    const messages = await getMessages(room.roomId);
    const ai = messages.find((m) => m.kind === 'ai');
    expect(ai?.text).toBe('Hello room');
    expect(frames).toContain('Hello room');
  });

  it('keeps partial text and posts an interruption note on mid-stream failure', async () => {
    const room = await createRoom({ userId, name: 'Ash', title: 'Flaky' });

    await runAiReply({
      roomId: room.roomId,
      appConfig,
      authorName: 'Ash',
      question: '@ai go',
      userId,
      fetchImpl: fetchWith(() => sseResponse(['partial '], { failAfter: 1 })),
    });

    const messages = await getMessages(room.roomId);
    const ai = messages.find((m) => m.kind === 'ai');
    expect(ai?.text).toBe('partial ');
    const note = messages.find((m) => m.kind === 'system');
    expect(note?.text).toContain('interrupted');
  });

  it('rejects a concurrent @ai while one reply is streaming', async () => {
    const room = await createRoom({ userId, name: 'Ash', title: 'Busy' });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slowFetch: FetchImpl = async () => {
      await gate;
      return sseResponse(['done']);
    };

    const first = runAiReply({
      roomId: room.roomId,
      appConfig,
      authorName: 'Ash',
      question: '@ai one',
      userId,
      fetchImpl: slowFetch,
    });
    await new Promise((r) => setTimeout(r, 20));
    await runAiReply({
      roomId: room.roomId,
      appConfig,
      authorName: 'Sam',
      question: '@ai two',
      userId,
      fetchImpl: fetchWith(() => sseResponse(['never'])),
    });
    release();
    await first;

    const messages = await getMessages(room.roomId);
    expect(messages.some((m) => m.kind === 'system' && m.text.includes('one at a time'))).toBe(
      true,
    );
    const aiMessages = messages.filter((m) => m.kind === 'ai');
    expect(aiMessages).toHaveLength(1);
    expect(aiMessages[0].text).toBe('done');
  });
});

describe('summarizeRoom', () => {
  it('scope "me" returns text without storing a message', async () => {
    const room = await createRoom({ userId, name: 'Ash', title: 'Recap' });
    await postMessage({ roomId: room.roomId, userId, name: 'Ash', text: 'idea' });
    const before = (await getMessages(room.roomId)).length;

    const result = await summarizeRoom({
      roomId: room.roomId,
      scope: 'me',
      appConfig,
      fetchImpl: fetchWith(() => sseResponse(['private recap'])),
    });

    expect(result.text).toBe('private recap');
    expect(result.message).toBeUndefined();
    expect((await getMessages(room.roomId)).length).toBe(before);
  });

  it('scope "room" posts the recap as an ai message and broadcasts it', async () => {
    const room = await createRoom({ userId, name: 'Ash', title: 'Recap 2' });
    const listener = fakeListener(room.roomId);

    const result = await summarizeRoom({
      roomId: room.roomId,
      scope: 'room',
      appConfig,
      fetchImpl: fetchWith(() => sseResponse(['shared recap'])),
    });

    expect(result.message?.text).toBe('shared recap');
    expect(listener.read()).toContain('shared recap');
    const messages = await getMessages(room.roomId);
    expect(messages.some((m) => m.kind === 'ai' && m.text === 'shared recap')).toBe(true);
  });
});

describe('queryRoomFiles', () => {
  const { queryRoomFiles } = require('./ai');
  const OLD_ENV = process.env.RAG_API_URL;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
  });

  afterEach(() => {
    if (OLD_ENV === undefined) {
      delete process.env.RAG_API_URL;
    } else {
      process.env.RAG_API_URL = OLD_ENV;
    }
  });

  const ragHit = (content, distance) =>
    JSON.stringify([[{ page_content: content, metadata: { source: '/f.pdf' } }, distance]]);

  it('returns top chunks ordered by distance across files', async () => {
    process.env.RAG_API_URL = 'http://rag.test';
    const responses = {
      f1: ragHit('far chunk', 0.9),
      f2: ragHit('near chunk', 0.1),
    };
    const fetchImpl = async (url, init) => {
      const { file_id } = JSON.parse(init.body);
      return new Response(responses[file_id], { status: 200 });
    };
    const context = await queryRoomFiles({
      userId,
      fileIds: ['f1', 'f2'],
      query: 'q',
      fetchImpl,
    });
    expect(context.indexOf('near chunk')).toBeLessThan(context.indexOf('far chunk'));
  });

  it('degrades to empty on failures and missing RAG url', async () => {
    delete process.env.RAG_API_URL;
    expect(await queryRoomFiles({ userId, fileIds: ['f1'], query: 'q' })).toBe('');

    process.env.RAG_API_URL = 'http://rag.test';
    const failing = async () => {
      throw new Error('down');
    };
    expect(
      await queryRoomFiles({ userId, fileIds: ['f1'], query: 'q', fetchImpl: failing }),
    ).toBe('');
  });
});
