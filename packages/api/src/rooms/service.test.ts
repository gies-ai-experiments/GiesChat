import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '@librechat/data-schemas';
import {
  RoomError,
  createRoom,
  joinRoom,
  getMyRooms,
  getRoomSnapshot,
  postMessage,
  archiveRoom,
  attachFile,
  detachFile,
  MESSAGE_TEXT_CAP,
} from './service';
import { checkLimit, resetLimits } from './limits';

let mongoServer: MongoMemoryServer;
const owner = new mongoose.Types.ObjectId().toHexString();
const member = new mongoose.Types.ObjectId().toHexString();
const stranger = new mongoose.Types.ObjectId().toHexString();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  createModels(mongoose);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('rooms service', () => {
  it('createRoom creates owner participant and unguessable id', async () => {
    const room = await createRoom({ userId: owner, name: 'Ash', title: 'BADM 350' });
    expect(room.roomId).toHaveLength(21);
    const snapshot = await getRoomSnapshot({ roomId: room.roomId, userId: owner });
    expect(snapshot.participants).toHaveLength(1);
    expect(snapshot.participants[0].role).toBe('owner');
  });

  it('joinRoom is idempotent and posts a single join note', async () => {
    const room = await createRoom({ userId: owner, name: 'Ash', title: 'Join test' });
    const first = await joinRoom({ roomId: room.roomId, userId: member, name: 'Sam' });
    expect(first.joined).toBe(true);
    expect(first.systemMessage?.text).toBe('Sam joined');
    const second = await joinRoom({ roomId: room.roomId, userId: member, name: 'Sam' });
    expect(second.joined).toBe(false);
    const snapshot = await getRoomSnapshot({ roomId: room.roomId, userId: member });
    expect(snapshot.messages.filter((m) => m.kind === 'system')).toHaveLength(1);
  });

  it('non-members cannot snapshot or post', async () => {
    const room = await createRoom({ userId: owner, name: 'Ash', title: 'Private' });
    await expect(getRoomSnapshot({ roomId: room.roomId, userId: stranger })).rejects.toThrow(
      new RoomError('not_member'),
    );
    await expect(
      postMessage({ roomId: room.roomId, userId: stranger, name: 'X', text: 'hi' }),
    ).rejects.toMatchObject({ code: 'not_member', status: 403 });
  });

  it('unknown room 404s', async () => {
    await expect(getRoomSnapshot({ roomId: 'nope', userId: owner })).rejects.toMatchObject({
      code: 'room_not_found',
      status: 404,
    });
  });

  it('caps message length and rejects empty', async () => {
    const room = await createRoom({ userId: owner, name: 'Ash', title: 'Caps' });
    await expect(
      postMessage({
        roomId: room.roomId,
        userId: owner,
        name: 'Ash',
        text: 'x'.repeat(MESSAGE_TEXT_CAP + 1),
      }),
    ).rejects.toMatchObject({ code: 'message_too_long' });
    await expect(
      postMessage({ roomId: room.roomId, userId: owner, name: 'Ash', text: '   ' }),
    ).rejects.toMatchObject({ code: 'message_too_long' });
  });

  it('archive is owner-only and blocks writes but not reads', async () => {
    const room = await createRoom({ userId: owner, name: 'Ash', title: 'Archive' });
    await joinRoom({ roomId: room.roomId, userId: member, name: 'Sam' });
    await expect(archiveRoom({ roomId: room.roomId, userId: member })).rejects.toMatchObject({
      code: 'not_owner',
    });
    const archived = await archiveRoom({ roomId: room.roomId, userId: owner });
    expect(archived.archived).toBe(true);
    await expect(
      postMessage({ roomId: room.roomId, userId: member, name: 'Sam', text: 'hi' }),
    ).rejects.toMatchObject({ code: 'room_archived' });
    const snapshot = await getRoomSnapshot({ roomId: room.roomId, userId: member });
    expect(snapshot.room.archived).toBe(true);
  });

  it('getMyRooms returns counts and sorts by activity', async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    await createRoom({ userId, name: 'U', title: 'Quiet' });
    const busy = await createRoom({ userId, name: 'U', title: 'Busy' });
    await postMessage({ roomId: busy.roomId, userId, name: 'U', text: 'activity' });
    const rooms = await getMyRooms(userId);
    expect(rooms).toHaveLength(2);
    expect(rooms[0].title).toBe('Busy');
    expect(rooms[0].participantCount).toBe(1);
    expect(rooms[1].title).toBe('Quiet');
  });

  it('snapshot counts unread then resets lastReadAt', async () => {
    const room = await createRoom({ userId: owner, name: 'Ash', title: 'Unread' });
    await joinRoom({ roomId: room.roomId, userId: member, name: 'Sam' });
    await getRoomSnapshot({ roomId: room.roomId, userId: member });
    await postMessage({ roomId: room.roomId, userId: owner, name: 'Ash', text: 'one' });
    await postMessage({ roomId: room.roomId, userId: owner, name: 'Ash', text: 'two' });
    const snapshot = await getRoomSnapshot({ roomId: room.roomId, userId: member });
    expect(snapshot.unreadCount).toBe(2);
    const after = await getRoomSnapshot({ roomId: room.roomId, userId: member });
    expect(after.unreadCount).toBe(0);
  });
});

describe('limits', () => {
  beforeEach(() => resetLimits());

  it('allows max hits then blocks within window', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkLimit('u1:test', 3, 1000)).toBe(true);
    }
    expect(checkLimit('u1:test', 3, 1000)).toBe(false);
    expect(checkLimit('u2:test', 3, 1000)).toBe(true);
  });

  it('slides the window', () => {
    jest.useFakeTimers();
    try {
      expect(checkLimit('u1:w', 1, 1000)).toBe(true);
      expect(checkLimit('u1:w', 1, 1000)).toBe(false);
      jest.setSystemTime(Date.now() + 1001);
      expect(checkLimit('u1:w', 1, 1000)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('room files', () => {
  it('attach is member-gated; detach is owner-only', async () => {
    const room = await createRoom({ userId: owner, name: 'Ash', title: 'Files' });
    await joinRoom({ roomId: room.roomId, userId: member, name: 'Sam' });

    await expect(
      attachFile({ roomId: room.roomId, userId: stranger, fileId: 'f1' }),
    ).rejects.toMatchObject({ code: 'not_member' });

    const attached = await attachFile({ roomId: room.roomId, userId: member, fileId: 'f1' });
    expect(attached.fileIds).toEqual(['f1']);
    const again = await attachFile({ roomId: room.roomId, userId: member, fileId: 'f1' });
    expect(again.fileIds).toEqual(['f1']);

    await expect(
      detachFile({ roomId: room.roomId, userId: member, fileId: 'f1' }),
    ).rejects.toMatchObject({ code: 'not_owner' });
    const detached = await detachFile({ roomId: room.roomId, userId: owner, fileId: 'f1' });
    expect(detached.fileIds).toEqual([]);
  });

  it('attach refuses on archived rooms', async () => {
    const room = await createRoom({ userId: owner, name: 'Ash', title: 'Files closed' });
    await archiveRoom({ roomId: room.roomId, userId: owner });
    await expect(
      attachFile({ roomId: room.roomId, userId: owner, fileId: 'f1' }),
    ).rejects.toMatchObject({ code: 'room_archived' });
  });
});
