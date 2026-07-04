import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { TRoomPoll } from 'librechat-data-provider';
import { parsePollCommand } from '../MessageInput';
import PollCard from '../PollCard';

const mockVote = jest.fn();
const mockClose = jest.fn();

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${Object.values(values).join(',')}` : key,
}));

jest.mock('~/data-provider', () => ({
  useVoteRoomPollMutation: () => ({ mutate: mockVote, isLoading: false }),
  useCloseRoomPollMutation: () => ({ mutate: mockClose, isLoading: false }),
}));

const openPoll: TRoomPoll = {
  roomId: 'r1',
  pollId: 'p1',
  question: 'Pick a topic',
  options: ['Alpha', 'Beta'],
  status: 'open',
  createdBy: 'user-2',
  myVote: 1,
  voteCount: 3,
};

describe('PollCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('open poll: votes are clickable, tally hidden, no counts shown', () => {
    render(<PollCard roomId="r1" poll={openPoll} currentUserId="user-1" isOwner={false} />);
    fireEvent.click(screen.getByText('Alpha'));
    expect(mockVote).toHaveBeenCalledWith({ pollId: 'p1', optionIndex: 0 });
    expect(screen.getByText('com_ui_brainstorm_poll_hidden:3')).toBeInTheDocument();
    expect(screen.queryByText('com_ui_brainstorm_poll_close')).not.toBeInTheDocument();
  });

  it('creator can close their own poll', () => {
    render(<PollCard roomId="r1" poll={openPoll} currentUserId="user-2" isOwner={false} />);
    fireEvent.click(screen.getByText('com_ui_brainstorm_poll_close'));
    expect(mockClose).toHaveBeenCalledWith('p1');
  });

  it('closed poll shows counts and disables voting', () => {
    const closed: TRoomPoll = { ...openPoll, status: 'closed', tally: [1, 2], voteCount: 3 };
    render(<PollCard roomId="r1" poll={closed} currentUserId="user-1" isOwner={true} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Alpha'));
    expect(mockVote).not.toHaveBeenCalled();
    expect(screen.queryByText('com_ui_brainstorm_poll_close')).not.toBeInTheDocument();
  });
});

describe('parsePollCommand', () => {
  it('parses /poll question and options', () => {
    expect(parsePollCommand('/poll Which topic? | AI | Blockchain')).toEqual({
      question: 'Which topic?',
      options: ['AI', 'Blockchain'],
    });
  });

  it('returns null for plain messages', () => {
    expect(parsePollCommand('hello /poll-ish message')).toBeNull();
  });
});
