import type { TFile } from './files';

export const AI_MENTION_PATTERN: RegExp = /(^|[^\w.@-])@ai\b/i;

export type TRoomMessageKind = 'user' | 'ai' | 'system' | 'app';
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
  messageCount7d: number;
  fileCount: number;
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
  appUrl?: string;
  createdAt?: string;
};

export type TRoomPoll = {
  roomId: string;
  pollId: string;
  question: string;
  options: string[];
  status: TRoomPollStatus;
  expiresAt?: string;
  createdBy: string;
  myVote?: number;
  tally?: number[];
  voteCount: number;
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

export type TRoomBuildStackType =
  | 'react_website'
  | 'mobile_app'
  | 'data_visualization'
  | 'slides'
  | '3d_game'
  | 'document'
  | 'spreadsheet'
  | 'design'
  | 'animation';

export type TDraftRoomBuildResponse = {
  prompt: string;
};

export type TStartRoomBuildRequest = {
  prompt: string;
  stackType: TRoomBuildStackType;
};
