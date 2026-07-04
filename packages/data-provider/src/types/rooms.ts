import type { TFile } from './files';

export type TRoomMessageKind = 'user' | 'ai' | 'system';
export type TRoomPollStatus = 'open' | 'closed';
export type TRoomParticipantRole = 'owner' | 'member';

export type TRoom = {
  roomId: string;
  title: string;
  creatorId: string;
  agentId?: string;
  fileIds: string[];
  contextText?: string;
  archived: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TRoomListItem = {
  roomId: string;
  title: string;
  archived: boolean;
  participantCount: number;
  lastMessageAt?: string;
};

export type TRoomParticipant = {
  userId: string;
  name: string;
  role: TRoomParticipantRole;
  online?: boolean;
  lastSeenAt?: string;
  lastReadAt?: string;
};

export type TRoomMessage = {
  roomId: string;
  messageId: string;
  authorId: string;
  authorName: string;
  kind: TRoomMessageKind;
  text: string;
  createdAt?: string;
};

export type TRoomPoll = {
  roomId: string;
  pollId: string;
  question: string;
  options: string[];
  votes?: Record<string, number>;
  status: TRoomPollStatus;
  expiresAt?: string;
  createdBy: string;
};

export type TRoomSnapshot = {
  room: TRoom;
  participants: TRoomParticipant[];
  messages: TRoomMessage[];
  polls: TRoomPoll[];
  files: TFile[];
  unreadCount: number;
};

export type TCreateRoomRequest = {
  title: string;
  agentId?: string;
  contextText?: string;
};

export type TJoinRoomResponse = {
  roomId: string;
  joined: boolean;
};

export type TSendRoomMessageRequest = {
  text: string;
};

export type TSummarizeRoomRequest = {
  scope: 'room' | 'me';
};

export type TSummarizeRoomResponse = {
  text?: string;
  message?: TRoomMessage;
};

export type TCreateRoomPollRequest = {
  question: string;
  options: string[];
  expiresAt?: string;
};

export type TVoteRoomPollRequest = {
  optionIndex: number;
};

export type TRoomPresenceEvent = {
  userId: string;
  online: boolean;
};

export type TRoomTypingEvent = {
  userId: string;
  name: string;
};

export type TRoomAiDeltaEvent = {
  messageId: string;
  delta: string;
};
