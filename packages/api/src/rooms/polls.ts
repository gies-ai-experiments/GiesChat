import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import type { Model } from 'mongoose';
import type { IRoomPoll } from '@librechat/data-schemas';
import { RoomError, assertMember, getRoom } from './service';

const RoomPoll = () => mongoose.models.RoomPoll as Model<IRoomPoll>;

export type PollErrorCode = 'poll_not_found' | 'poll_closed' | 'invalid_poll' | 'invalid_vote';

export class PollError extends Error {
  code: PollErrorCode;
  status: number;

  constructor(code: PollErrorCode) {
    super(code);
    this.code = code;
    const statuses: Record<PollErrorCode, number> = {
      poll_not_found: 404,
      poll_closed: 409,
      invalid_poll: 400,
      invalid_vote: 400,
    };
    this.status = statuses[code];
  }
}

/** Serialized poll for API responses: hides per-user votes; tally only when closed. */
export interface PollView {
  roomId: string;
  pollId: string;
  question: string;
  options: string[];
  status: 'open' | 'closed';
  expiresAt?: Date;
  createdBy: string;
  myVote?: number;
  tally?: number[];
  voteCount: number;
}

const choicesOf = (votes: IRoomPoll['votes']): number[] =>
  votes instanceof Map ? [...votes.values()] : Object.values(votes ?? {});

const voteOf = (votes: IRoomPoll['votes'], userId: string): number | undefined =>
  votes instanceof Map ? votes.get(userId) : (votes ?? ({} as Record<string, number>))[userId];

export function toPollView(poll: IRoomPoll, userId: string): PollView {
  const choices = choicesOf(poll.votes);
  return {
    roomId: poll.roomId,
    pollId: poll.pollId,
    question: poll.question,
    options: poll.options,
    status: poll.status,
    expiresAt: poll.expiresAt,
    createdBy: poll.createdBy.toString(),
    myVote: voteOf(poll.votes, userId),
    tally:
      poll.status === 'closed'
        ? poll.options.map((_, idx) => choices.filter((c) => c === idx).length)
        : undefined,
    voteCount: choices.length,
  };
}

export async function createPoll(params: {
  roomId: string;
  userId: string;
  question: string;
  options: string[];
  expiresAt?: Date;
}): Promise<IRoomPoll> {
  const room = await getRoom(params.roomId);
  if (room.archived) {
    throw new RoomError('room_archived');
  }
  await assertMember(params.roomId, params.userId);
  const question = params.question.trim();
  const options = params.options.map((o) => o.trim()).filter((o) => o !== '');
  if (question === '' || options.length < 2 || options.length > 10) {
    throw new PollError('invalid_poll');
  }
  return RoomPoll().create({
    roomId: params.roomId,
    pollId: nanoid(21),
    question,
    options,
    votes: new Map(),
    status: 'open',
    expiresAt: params.expiresAt,
    createdBy: new mongoose.Types.ObjectId(params.userId),
  });
}

async function getOpenPoll(roomId: string, pollId: string): Promise<IRoomPoll> {
  const poll = await RoomPoll().findOne({ roomId, pollId });
  if (!poll) {
    throw new PollError('poll_not_found');
  }
  if (poll.status === 'closed') {
    throw new PollError('poll_closed');
  }
  if (poll.expiresAt && poll.expiresAt.getTime() <= Date.now()) {
    poll.status = 'closed';
    await poll.save();
    throw new PollError('poll_closed');
  }
  return poll;
}

export async function votePoll(params: {
  roomId: string;
  pollId: string;
  userId: string;
  optionIndex: number;
}): Promise<IRoomPoll> {
  await assertMember(params.roomId, params.userId);
  const poll = await getOpenPoll(params.roomId, params.pollId);
  if (
    !Number.isInteger(params.optionIndex) ||
    params.optionIndex < 0 ||
    params.optionIndex >= poll.options.length
  ) {
    throw new PollError('invalid_vote');
  }
  poll.votes.set(params.userId, params.optionIndex);
  await poll.save();
  return poll;
}

export async function closePoll(params: {
  roomId: string;
  pollId: string;
  userId: string;
}): Promise<{ poll: IRoomPoll; tallyText: string }> {
  const participant = await assertMember(params.roomId, params.userId);
  const poll = await RoomPoll().findOne({ roomId: params.roomId, pollId: params.pollId });
  if (!poll) {
    throw new PollError('poll_not_found');
  }
  if (poll.status === 'closed') {
    throw new PollError('poll_closed');
  }
  const isCreator = poll.createdBy.toString() === params.userId;
  if (!isCreator && participant.role !== 'owner') {
    throw new RoomError('not_owner');
  }
  poll.status = 'closed';
  await poll.save();
  const choices = choicesOf(poll.votes);
  const counts = poll.options.map(
    (option, idx) => `${option}: ${choices.filter((c) => c === idx).length}`,
  );
  const tallyText = `Poll closed — "${poll.question}": ${counts.join(', ')}`;
  return { poll, tallyText };
}
