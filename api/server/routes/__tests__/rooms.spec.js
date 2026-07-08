jest.mock('~/server/middleware/requireJwtAuth', () => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

jest.mock('~/models', () => ({
  getFiles: jest.fn(async () => []),
}));

jest.mock('~/config', () => ({
  getMCPManager: () => ({ callTool: jest.fn(async () => ['', undefined]) }),
  getFlowStateManager: () => ({}),
}));

jest.mock('~/cache', () => ({ getLogStores: () => ({}) }));

const { PassThrough } = require('stream');
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createModels } = require('@librechat/data-schemas');
const { subscribe, resetBroadcast, resetLimits } = require('@librechat/api');
const roomsRoute = require('../rooms');

let mongoServer;

function createApp(user) {
  const app = express();
  app.use(express.json());
  if (user) {
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
  }
  app.use('/api/rooms', roomsRoute);
  return app;
}

const owner = { id: new mongoose.Types.ObjectId().toHexString(), name: 'Ash' };
const member = { id: new mongoose.Types.ObjectId().toHexString(), name: 'Sam' };
const stranger = { id: new mongoose.Types.ObjectId().toHexString(), name: 'Zed' };

function fakeSseClient(roomId, userId) {
  const stream = new PassThrough();
  const chunks = [];
  stream.on('data', (c) => chunks.push(c));
  stream.writeHead = () => stream;
  subscribe(roomId, userId, stream);
  return { read: () => Buffer.concat(chunks).toString() };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  createModels(mongoose);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  resetBroadcast();
  resetLimits();
});

describe('/api/rooms', () => {
  it('requires auth', async () => {
    await request(createApp(null)).get('/api/rooms').expect(401);
  });

  it('creates a room and lists it', async () => {
    const app = createApp(owner);
    const created = await request(app).post('/api/rooms').send({ title: 'BADM 350' }).expect(201);
    expect(created.body.roomId).toHaveLength(21);
    const list = await request(app).get('/api/rooms').expect(200);
    expect(list.body.some((r) => r.roomId === created.body.roomId)).toBe(true);
  });

  it('rejects invalid titles', async () => {
    await request(createApp(owner)).post('/api/rooms').send({ title: '  ' }).expect(400);
  });

  it('blocks non-members from snapshot and messages', async () => {
    const app = createApp(owner);
    const { body: room } = await request(app).post('/api/rooms').send({ title: 'Private' });
    await request(createApp(stranger)).get(`/api/rooms/${room.roomId}`).expect(403);
    await request(createApp(stranger))
      .post(`/api/rooms/${room.roomId}/messages`)
      .send({ text: 'hi' })
      .expect(403);
    await request(createApp(stranger)).get(`/api/rooms/${room.roomId}/stream`).expect(403);
  });

  it('join-by-link then message; live subscribers receive the frame', async () => {
    const ownerApp = createApp(owner);
    const memberApp = createApp(member);
    const { body: room } = await request(ownerApp).post('/api/rooms').send({ title: 'Live' });

    const listener = fakeSseClient(room.roomId, owner.id);
    await request(memberApp).post(`/api/rooms/${room.roomId}/join`).expect(200);
    const { body: message } = await request(memberApp)
      .post(`/api/rooms/${room.roomId}/messages`)
      .send({ text: 'hello room' })
      .expect(201);

    expect(message.authorName).toBe('Sam');
    const frames = listener.read();
    expect(frames).toContain('Sam joined');
    expect(frames).toContain('hello room');

    const snapshot = await request(memberApp).get(`/api/rooms/${room.roomId}`).expect(200);
    expect(snapshot.body.messages.map((m) => m.kind)).toEqual(['system', 'user']);
    expect(snapshot.body.participants).toHaveLength(2);
    expect(snapshot.body.participants.find((p) => p.name === 'Ash').online).toBe(true);
  });

  it('archive is owner-only and blocks further messages', async () => {
    const ownerApp = createApp(owner);
    const memberApp = createApp(member);
    const { body: room } = await request(ownerApp).post('/api/rooms').send({ title: 'Arch' });
    await request(memberApp).post(`/api/rooms/${room.roomId}/join`).expect(200);
    await request(memberApp).patch(`/api/rooms/${room.roomId}/archive`).expect(403);
    await request(ownerApp).patch(`/api/rooms/${room.roomId}/archive`).expect(200);
    await request(ownerApp)
      .post(`/api/rooms/${room.roomId}/messages`)
      .send({ text: 'too late' })
      .expect(403);
  });

  it('rate limits room creation', async () => {
    const app = createApp({ id: new mongoose.Types.ObjectId().toHexString(), name: 'Limit' });
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/rooms').send({ title: `Room ${i}` }).expect(201);
    }
    await request(app).post('/api/rooms').send({ title: 'Sixth' }).expect(429);
  });
});

describe('build routes', () => {
  it('requires ownership to draft', async () => {
    const app = createApp(owner);
    const created = await request(app).post('/api/rooms').send({ title: 'T' }).expect(201);
    const roomId = created.body.roomId;

    const memberApp = createApp(member);
    await request(memberApp).post(`/api/rooms/${roomId}/join`).expect(200);
    await request(memberApp).post(`/api/rooms/${roomId}/build/draft`).expect(403);
  });

  it('rejects a non-owner starting a build', async () => {
    const app = createApp(owner);
    const created = await request(app).post('/api/rooms').send({ title: 'T' }).expect(201);
    const roomId = created.body.roomId;
    const memberApp = createApp(member);
    await request(memberApp).post(`/api/rooms/${roomId}/join`).expect(200);
    await request(memberApp)
      .post(`/api/rooms/${roomId}/build`)
      .send({ prompt: 'x', stackType: 'react_website' })
      .expect(403);
  });

  it('validates the start-build payload', async () => {
    const app = createApp(owner);
    const created = await request(app).post('/api/rooms').send({ title: 'T' }).expect(201);
    await request(app)
      .post(`/api/rooms/${created.body.roomId}/build`)
      .send({ prompt: '', stackType: 'react_website' })
      .expect(400);
  });
});
