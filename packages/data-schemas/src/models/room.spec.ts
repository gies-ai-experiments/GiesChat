import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  createRoomModel,
  createRoomParticipantModel,
  createRoomMessageModel,
  createRoomPollModel,
} from './room';

let mongoServer: InstanceType<typeof MongoMemoryServer>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('room models', () => {
  const Room = createRoomModel(mongoose);
  const RoomParticipant = createRoomParticipantModel(mongoose);
  const RoomMessage = createRoomMessageModel(mongoose);
  const RoomPoll = createRoomPollModel(mongoose);
  const creatorId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await Promise.all([
      Room.syncIndexes(),
      RoomParticipant.syncIndexes(),
      RoomMessage.syncIndexes(),
      RoomPoll.syncIndexes(),
    ]);
  });

  it('creates a room with defaults', async () => {
    const room = await Room.create({ roomId: 'r'.repeat(21), title: 'Test', creatorId });
    expect(room.archived).toBe(false);
    expect(room.fileIds).toEqual([]);
    expect(room.createdAt).toBeInstanceOf(Date);
  });

  it('rejects duplicate roomId', async () => {
    await Room.create({ roomId: 'dup-room-id', title: 'A', creatorId });
    await expect(Room.create({ roomId: 'dup-room-id', title: 'B', creatorId })).rejects.toThrow(
      /duplicate key/,
    );
  });

  it('rejects duplicate participant per room, allows same user across rooms', async () => {
    const userId = new mongoose.Types.ObjectId();
    await RoomParticipant.create({ roomId: 'room-a', userId, name: 'Ash', role: 'owner' });
    await expect(
      RoomParticipant.create({ roomId: 'room-a', userId, name: 'Ash' }),
    ).rejects.toThrow(/duplicate key/);
    const other = await RoomParticipant.create({ roomId: 'room-b', userId, name: 'Ash' });
    expect(other.role).toBe('member');
  });

  it('stores messages with kind default and unique messageId', async () => {
    const msg = await RoomMessage.create({
      roomId: 'room-a',
      messageId: 'msg-1',
      authorId: 'system',
      authorName: 'System',
      text: 'hello',
    });
    expect(msg.kind).toBe('user');
    await expect(
      RoomMessage.create({
        roomId: 'room-a',
        messageId: 'msg-1',
        authorId: 'system',
        authorName: 'System',
        text: 'again',
      }),
    ).rejects.toThrow(/duplicate key/);
  });

  it('round-trips poll votes as a Map', async () => {
    const voter = new mongoose.Types.ObjectId().toHexString();
    await RoomPoll.create({
      roomId: 'room-a',
      pollId: 'poll-1',
      question: 'Topic?',
      options: ['A', 'B'],
      votes: new Map([[voter, 1]]),
      createdBy: creatorId,
    });
    const found = await RoomPoll.findOne({ pollId: 'poll-1' }).lean();
    expect(found?.status).toBe('open');
    expect(found?.votes).toEqual({ [voter]: 1 });
  });
});
