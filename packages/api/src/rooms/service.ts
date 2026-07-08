import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import type { Model, Types } from 'mongoose';
import type { IRoom, IRoomMessage, IRoomParticipant, IRoomPoll } from '@librechat/data-schemas';

export const MESSAGE_TEXT_CAP = 8000;
export const CONTEXT_TEXT_CAP = 20000;
const SNAPSHOT_MESSAGE_LIMIT = 50;
const CLOSED_POLL_WINDOW_MS = 24 * 60 * 60 * 1000;

export type RoomErrorCode =
  | 'room_not_found'
  | 'not_member'
  | 'not_owner'
  | 'room_archived'
  | 'message_too_long'
  | 'rate_limited';

const ERROR_STATUS: Record<RoomErrorCode, number> = {
  room_not_found: 404,
  not_member: 403,
  not_owner: 403,
  room_archived: 403,
  message_too_long: 400,
  rate_limited: 429,
};

export class RoomError extends Error {
  code: RoomErrorCode;
  status: number;

  constructor(code: RoomErrorCode) {
    super(code);
    this.code = code;
    this.status = ERROR_STATUS[code];
  }
}

const Room = () => mongoose.models.Room as Model<IRoom>;
const RoomParticipant = () => mongoose.models.RoomParticipant as Model<IRoomParticipant>;
const RoomMessage = () => mongoose.models.RoomMessage as Model<IRoomMessage>;
const RoomPoll = () => mongoose.models.RoomPoll as Model<IRoomPoll>;

export interface RoomListItem {
  roomId: string;
  title: string;
  archived: boolean;
  participantCount: number;
  messageCount7d: number;
  fileCount: number;
  lastMessageAt?: Date;
}

export interface RoomSnapshot {
  room: IRoom;
  participants: IRoomParticipant[];
  messages: IRoomMessage[];
  polls: IRoomPoll[];
  unreadCount: number;
}

export async function createRoom(params: {
  userId: string;
  name: string;
  title: string;
  agentId?: string;
  contextText?: string;
}): Promise<IRoom> {
  const room = await Room().create({
    roomId: nanoid(21),
    title: params.title.trim(),
    creatorId: new mongoose.Types.ObjectId(params.userId),
    agentId: params.agentId,
    contextText: params.contextText?.slice(0, CONTEXT_TEXT_CAP),
    fileIds: [],
    archived: false,
  });
  await RoomParticipant().create({
    roomId: room.roomId,
    userId: room.creatorId,
    name: params.name,
    role: 'owner',
  });
  return room;
}

export async function getRoom(roomId: string): Promise<IRoom> {
  const room = await Room().findOne({ roomId }).lean<IRoom>();
  if (!room) {
    throw new RoomError('room_not_found');
  }
  return room;
}

export async function assertMember(roomId: string, userId: string): Promise<IRoomParticipant> {
  const participant = await RoomParticipant()
    .findOne({ roomId, userId: new mongoose.Types.ObjectId(userId) })
    .lean<IRoomParticipant>();
  if (!participant) {
    throw new RoomError('not_member');
  }
  return participant;
}

export async function assertOwner(roomId: string, userId: string): Promise<IRoomParticipant> {
  const participant = await assertMember(roomId, userId);
  if (participant.role !== 'owner') {
    throw new RoomError('not_owner');
  }
  return participant;
}

export async function joinRoom(params: {
  roomId: string;
  userId: string;
  name: string;
}): Promise<{ room: IRoom; joined: boolean; systemMessage?: IRoomMessage }> {
  const room = await getRoom(params.roomId);
  const userId = new mongoose.Types.ObjectId(params.userId);
  const existing = await RoomParticipant().findOne({ roomId: room.roomId, userId });
  if (existing) {
    return { room, joined: false };
  }
  await RoomParticipant().create({
    roomId: room.roomId,
    userId,
    name: params.name,
    role: 'member',
  });
  if (room.archived) {
    return { room, joined: true };
  }
  const systemMessage = await postSystemMessage(room.roomId, `${params.name} joined`);
  return { room, joined: true, systemMessage };
}

export async function getMyRooms(userId: string): Promise<RoomListItem[]> {
  const memberships = await RoomParticipant()
    .find({ userId: new mongoose.Types.ObjectId(userId) })
    .lean<IRoomParticipant[]>();
  const roomIds = memberships.map((m) => m.roomId);
  if (roomIds.length === 0) {
    return [];
  }
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [rooms, counts, messageStats] = await Promise.all([
    Room()
      .find({ roomId: { $in: roomIds } })
      .lean<IRoom[]>(),
    RoomParticipant().aggregate<{ _id: string; count: number }>([
      { $match: { roomId: { $in: roomIds } } },
      { $group: { _id: '$roomId', count: { $sum: 1 } } },
    ]),
    RoomMessage().aggregate<{ _id: string; lastMessageAt: Date; messageCount7d: number }>([
      { $match: { roomId: { $in: roomIds } } },
      {
        $group: {
          _id: '$roomId',
          lastMessageAt: { $max: '$createdAt' },
          messageCount7d: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$createdAt', weekAgo] }, { $ne: ['$kind', 'system'] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);
  const countByRoom = new Map(counts.map((c) => [c._id, c.count]));
  const statsByRoom = new Map(messageStats.map((m) => [m._id, m]));
  return rooms
    .map((room) => ({
      roomId: room.roomId,
      title: room.title,
      archived: room.archived,
      participantCount: countByRoom.get(room.roomId) ?? 0,
      messageCount7d: statsByRoom.get(room.roomId)?.messageCount7d ?? 0,
      fileCount: room.fileIds?.length ?? 0,
      lastMessageAt: statsByRoom.get(room.roomId)?.lastMessageAt,
    }))
    .sort((a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0));
}

export async function getRoomSnapshot(params: {
  roomId: string;
  userId: string;
}): Promise<RoomSnapshot> {
  const room = await getRoom(params.roomId);
  const participant = await assertMember(params.roomId, params.userId);
  const [participants, messagesDesc, polls, unreadCount] = await Promise.all([
    RoomParticipant().find({ roomId: room.roomId }).lean<IRoomParticipant[]>(),
    RoomMessage()
      .find({ roomId: room.roomId })
      .sort({ createdAt: -1 })
      .limit(SNAPSHOT_MESSAGE_LIMIT)
      .lean<IRoomMessage[]>(),
    RoomPoll()
      .find({
        roomId: room.roomId,
        $or: [
          { status: 'open' },
          { status: 'closed', updatedAt: { $gte: new Date(Date.now() - CLOSED_POLL_WINDOW_MS) } },
        ],
      })
      .lean<IRoomPoll[]>(),
    participant.lastReadAt
      ? RoomMessage().countDocuments({
          roomId: room.roomId,
          createdAt: { $gt: participant.lastReadAt },
        })
      : RoomMessage().countDocuments({ roomId: room.roomId }),
  ]);
  await RoomParticipant().updateOne({ _id: participant._id }, { $set: { lastReadAt: new Date() } });
  return { room, participants, messages: messagesDesc.reverse(), polls, unreadCount };
}

export async function postMessage(params: {
  roomId: string;
  userId: string;
  name: string;
  text: string;
}): Promise<IRoomMessage> {
  const room = await getRoom(params.roomId);
  if (room.archived) {
    throw new RoomError('room_archived');
  }
  await assertMember(params.roomId, params.userId);
  const text = params.text.trim();
  if (text.length === 0 || text.length > MESSAGE_TEXT_CAP) {
    throw new RoomError('message_too_long');
  }
  return RoomMessage().create({
    roomId: room.roomId,
    messageId: nanoid(21),
    authorId: params.userId,
    authorName: params.name,
    kind: 'user',
    text,
  });
}

export async function getRecentMessages(roomId: string, limit: number): Promise<IRoomMessage[]> {
  const docs = await RoomMessage()
    .find({ roomId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<IRoomMessage[]>();
  return docs.reverse();
}

export async function getClosedPolls(roomId: string): Promise<IRoomPoll[]> {
  return RoomPoll().find({ roomId, status: 'closed' }).lean<IRoomPoll[]>();
}

export async function postSystemMessage(roomId: string, text: string): Promise<IRoomMessage> {
  return RoomMessage().create({
    roomId,
    messageId: nanoid(21),
    authorId: 'system',
    authorName: 'System',
    kind: 'system',
    text,
  });
}

export async function createAiMessage(roomId: string, text: string): Promise<IRoomMessage> {
  return RoomMessage().create({
    roomId,
    messageId: nanoid(21),
    authorId: 'ai',
    authorName: 'AI',
    kind: 'ai',
    text,
  });
}

export async function createAppMessage(
  roomId: string,
  text: string,
  appUrl: string,
  authorId: string,
  authorName: string,
): Promise<IRoomMessage> {
  return RoomMessage().create({
    roomId,
    messageId: nanoid(21),
    authorId,
    authorName,
    kind: 'app',
    text,
    appUrl,
  });
}

export async function updateMessageText(messageId: string, text: string): Promise<void> {
  await RoomMessage().updateOne({ messageId }, { $set: { text } });
}

export async function attachFile(params: {
  roomId: string;
  userId: string;
  fileId: string;
}): Promise<IRoom> {
  const room = await getRoom(params.roomId);
  if (room.archived) {
    throw new RoomError('room_archived');
  }
  await assertMember(params.roomId, params.userId);
  const updated = await Room().findOneAndUpdate(
    { roomId: params.roomId },
    { $addToSet: { fileIds: params.fileId } },
    { new: true },
  );
  if (!updated) {
    throw new RoomError('room_not_found');
  }
  return updated;
}

export async function detachFile(params: {
  roomId: string;
  userId: string;
  fileId: string;
}): Promise<IRoom> {
  const participant = await assertMember(params.roomId, params.userId);
  if (participant.role !== 'owner') {
    throw new RoomError('not_owner');
  }
  const updated = await Room().findOneAndUpdate(
    { roomId: params.roomId },
    { $pull: { fileIds: params.fileId } },
    { new: true },
  );
  if (!updated) {
    throw new RoomError('room_not_found');
  }
  return updated;
}

export async function archiveRoom(params: { roomId: string; userId: string }): Promise<IRoom> {
  const participant = await assertMember(params.roomId, params.userId);
  if (participant.role !== 'owner') {
    throw new RoomError('not_owner');
  }
  const room = await Room().findOneAndUpdate(
    { roomId: params.roomId },
    { $set: { archived: true } },
    { new: true },
  );
  if (!room) {
    throw new RoomError('room_not_found');
  }
  return room;
}

export async function touchLastSeen(roomId: string, userId: string): Promise<void> {
  await RoomParticipant().updateOne(
    { roomId, userId: new mongoose.Types.ObjectId(userId) },
    { $set: { lastSeenAt: new Date() } },
  );
}

export function toUserObjectId(userId: string): Types.ObjectId {
  return new mongoose.Types.ObjectId(userId);
}
