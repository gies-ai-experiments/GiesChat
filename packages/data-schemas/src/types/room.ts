import type { Document, Types } from 'mongoose';

export type Room = {
  /** Unguessable nanoid(21) — the link is the invite capability */
  roomId: string;
  title: string;
  creatorId: Types.ObjectId;
  /** Optional GiesChat agent used as the @ai persona */
  agentId?: string;
  /** file_ids attached for RAG grounding */
  fileIds: string[];
  /** Seeded chat transcript injected into the @ai prompt (capped) */
  contextText?: string;
  archived: boolean;
};

export type IRoom = Room &
  Document & {
    _id: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
  };

export type RoomParticipantRole = 'owner' | 'member';

export type RoomParticipant = {
  roomId: string;
  userId: Types.ObjectId;
  /** Display name snapshotted at join time */
  name: string;
  role: RoomParticipantRole;
  lastSeenAt?: Date;
  lastReadAt?: Date;
};

export type IRoomParticipant = RoomParticipant &
  Document & {
    _id: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
  };

export type RoomMessageKind = 'user' | 'ai' | 'system' | 'app';

export type RoomMessage = {
  roomId: string;
  messageId: string;
  /** User ObjectId hex, or 'ai' / 'system' */
  authorId: string;
  /** Display name snapshotted at send time */
  authorName: string;
  kind: RoomMessageKind;
  text: string;
  appUrl?: string;
};

export type IRoomMessage = RoomMessage &
  Document & {
    _id: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
  };

export type RoomPollStatus = 'open' | 'closed';

export type RoomPoll = {
  roomId: string;
  pollId: string;
  question: string;
  options: string[];
  /** userId hex → option index; tally hidden while open */
  votes: Map<string, number>;
  status: RoomPollStatus;
  expiresAt?: Date;
  createdBy: Types.ObjectId;
};

export type IRoomPoll = RoomPoll &
  Document & {
    _id: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
  };
