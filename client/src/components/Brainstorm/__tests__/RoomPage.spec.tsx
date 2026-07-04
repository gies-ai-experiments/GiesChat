import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { TRoomSnapshot } from 'librechat-data-provider';
import RoomPage from '../RoomPage';

const mockJoin = jest.fn();
let mockJoinState: { isSuccess: boolean; isError: boolean };
let mockSnapshotState: { data?: TRoomSnapshot; isLoading: boolean; isError: boolean };

jest.mock('react-router-dom', () => ({
  useParams: () => ({ roomId: 'room-1' }),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useAuthContext: () => ({ user: { id: 'user-1' } }),
  useCopyToClipboard: () => jest.fn(),
}));

jest.mock('~/data-provider', () => ({
  useJoinRoomMutation: () => ({ mutate: mockJoin, ...mockJoinState }),
  useGetRoomSnapshotQuery: () => mockSnapshotState,
  useRoomStream: () => [],
  useArchiveRoomMutation: () => ({ mutate: jest.fn(), isLoading: false }),
  useSendRoomMessageMutation: () => ({ mutate: jest.fn(), isLoading: false }),
  useRoomTypingMutation: () => ({ mutate: jest.fn() }),
  useSummarizeRoomMutation: () => ({ mutate: jest.fn(), isLoading: false }),
}));

jest.mock('~/components/Chat/Messages/Content/MarkdownLite', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => <div>{content}</div>,
}));

const snapshot: TRoomSnapshot = {
  room: {
    roomId: 'room-1',
    title: 'BADM 350 Group',
    creatorId: 'user-1',
    fileIds: [],
    archived: false,
  },
  participants: [
    { userId: 'user-1', name: 'Ash', role: 'owner', online: true },
    { userId: 'user-2', name: 'Sam', role: 'member', online: false },
  ],
  messages: [
    {
      roomId: 'room-1',
      messageId: 'm1',
      authorId: 'system',
      authorName: 'System',
      kind: 'system',
      text: 'Sam joined',
    },
    {
      roomId: 'room-1',
      messageId: 'm2',
      authorId: 'user-2',
      authorName: 'Sam',
      kind: 'user',
      text: 'hello everyone',
    },
  ],
  polls: [],
  files: [],
  unreadCount: 0,
};

describe('RoomPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJoinState = { isSuccess: true, isError: false };
    mockSnapshotState = { data: snapshot, isLoading: false, isError: false };
  });

  it('joins the room on mount', () => {
    render(<RoomPage />);
    expect(mockJoin).toHaveBeenCalledWith('room-1');
  });

  it('shows a spinner while loading', () => {
    mockSnapshotState = { data: undefined, isLoading: true, isError: false };
    render(<RoomPage />);
    expect(screen.getByLabelText('loading')).toBeInTheDocument();
  });

  it('shows the error state when access is denied', () => {
    mockSnapshotState = { data: undefined, isLoading: false, isError: true };
    render(<RoomPage />);
    expect(screen.getByText('com_ui_brainstorm_error')).toBeInTheDocument();
  });

  it('renders title, messages, and participants on success', () => {
    render(<RoomPage />);
    expect(screen.getByText('BADM 350 Group')).toBeInTheDocument();
    expect(screen.getByText('Sam joined')).toBeInTheDocument();
    expect(screen.getByText('hello everyone')).toBeInTheDocument();
    expect(screen.getByTitle('Ash')).toBeInTheDocument();
    expect(screen.getByTitle('Sam')).toBeInTheDocument();
  });

  it('shows the archived banner and disables input when archived', () => {
    mockSnapshotState = {
      data: { ...snapshot, room: { ...snapshot.room, archived: true } },
      isLoading: false,
      isError: false,
    };
    render(<RoomPage />);
    expect(screen.getByText('com_ui_brainstorm_archived_banner')).toBeInTheDocument();
    expect(screen.getByLabelText('com_ui_brainstorm_input_placeholder')).toBeDisabled();
  });
});
