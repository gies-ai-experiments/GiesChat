import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '@librechat/data-schemas';
import { createPoll, votePoll, closePoll, toPollView } from './polls';
import { createRoom, joinRoom, archiveRoom } from './service';

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

const makeRoom = async () => {
  const room = await createRoom({ userId: owner, name: 'Ash', title: 'Polls' });
  await joinRoom({ roomId: room.roomId, userId: member, name: 'Sam' });
  return room;
};

describe('polls', () => {
  it('creates with 2-10 trimmed options, member-only', async () => {
    const room = await makeRoom();
    const poll = await createPoll({
      roomId: room.roomId,
      userId: member,
      question: ' Topic? ',
      options: [' A ', 'B', '  '],
    });
    expect(poll.question).toBe('Topic?');
    expect(poll.options).toEqual(['A', 'B']);

    await expect(
      createPoll({ roomId: room.roomId, userId: stranger, question: 'X?', options: ['A', 'B'] }),
    ).rejects.toMatchObject({ code: 'not_member' });
    await expect(
      createPoll({ roomId: room.roomId, userId: owner, question: 'X?', options: ['A'] }),
    ).rejects.toMatchObject({ code: 'invalid_poll' });
  });

  it('vote is changeable while open; tally hidden until closed', async () => {
    const room = await makeRoom();
    const poll = await createPoll({
      roomId: room.roomId,
      userId: owner,
      question: 'Pick',
      options: ['A', 'B'],
    });

    let updated = await votePoll({
      roomId: room.roomId,
      pollId: poll.pollId,
      userId: member,
      optionIndex: 0,
    });
    updated = await votePoll({
      roomId: room.roomId,
      pollId: poll.pollId,
      userId: member,
      optionIndex: 1,
    });

    const openView = toPollView(updated, member);
    expect(openView.myVote).toBe(1);
    expect(openView.tally).toBeUndefined();
    expect(openView.voteCount).toBe(1);

    await expect(
      votePoll({ roomId: room.roomId, pollId: poll.pollId, userId: member, optionIndex: 5 }),
    ).rejects.toMatchObject({ code: 'invalid_vote' });

    const { poll: closed, tallyText } = await closePoll({
      roomId: room.roomId,
      pollId: poll.pollId,
      userId: owner,
    });
    expect(tallyText).toContain('A: 0, B: 1');
    expect(toPollView(closed, member).tally).toEqual([0, 1]);
  });

  it('close is creator-or-owner; voting after close rejects', async () => {
    const room = await makeRoom();
    const poll = await createPoll({
      roomId: room.roomId,
      userId: owner,
      question: 'Q',
      options: ['A', 'B'],
    });
    await expect(
      closePoll({ roomId: room.roomId, pollId: poll.pollId, userId: member }),
    ).rejects.toMatchObject({ code: 'not_owner' });

    const memberPoll = await createPoll({
      roomId: room.roomId,
      userId: member,
      question: 'Mine',
      options: ['X', 'Y'],
    });
    await expect(
      closePoll({ roomId: room.roomId, pollId: memberPoll.pollId, userId: member }),
    ).resolves.toBeTruthy();

    await closePoll({ roomId: room.roomId, pollId: poll.pollId, userId: owner });
    await expect(
      votePoll({ roomId: room.roomId, pollId: poll.pollId, userId: member, optionIndex: 0 }),
    ).rejects.toMatchObject({ code: 'poll_closed' });
  });

  it('expired polls auto-close on vote', async () => {
    const room = await makeRoom();
    const poll = await createPoll({
      roomId: room.roomId,
      userId: owner,
      question: 'Late',
      options: ['A', 'B'],
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      votePoll({ roomId: room.roomId, pollId: poll.pollId, userId: member, optionIndex: 0 }),
    ).rejects.toMatchObject({ code: 'poll_closed' });
    const stored = await mongoose.models.RoomPoll.findOne({ pollId: poll.pollId }).lean();
    expect(stored.status).toBe('closed');
  });

  it('refuses polls in archived rooms', async () => {
    const room = await makeRoom();
    await archiveRoom({ roomId: room.roomId, userId: owner });
    await expect(
      createPoll({ roomId: room.roomId, userId: owner, question: 'Q', options: ['A', 'B'] }),
    ).rejects.toMatchObject({ code: 'room_archived' });
  });
});
