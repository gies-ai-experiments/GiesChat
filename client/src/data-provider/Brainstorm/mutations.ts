import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
  TRoom,
  TRoomPoll,
  TRoomMessage,
  TRoomSnapshot,
  TJoinRoomResponse,
  TCreateRoomRequest,
  TVoteRoomPollRequest,
  TSummarizeRoomRequest,
  TCreateRoomPollRequest,
  TSummarizeRoomResponse,
} from 'librechat-data-provider';

export const appendRoomMessage = (
  snapshot: TRoomSnapshot | undefined,
  message: TRoomMessage,
): TRoomSnapshot | undefined => {
  if (!snapshot) {
    return snapshot;
  }
  const existing = snapshot.messages.findIndex((m) => m.messageId === message.messageId);
  if (existing >= 0) {
    const messages = [...snapshot.messages];
    messages[existing] = message;
    return { ...snapshot, messages };
  }
  return { ...snapshot, messages: [...snapshot.messages, message] };
};

export const useCreateRoomMutation = (): UseMutationResult<TRoom, unknown, TCreateRoomRequest> => {
  const queryClient = useQueryClient();
  return useMutation((payload: TCreateRoomRequest) => dataService.createRoom(payload), {
    onSuccess: () => queryClient.invalidateQueries([QueryKeys.rooms]),
  });
};

export const useJoinRoomMutation = (): UseMutationResult<TJoinRoomResponse, unknown, string> => {
  const queryClient = useQueryClient();
  return useMutation((roomId: string) => dataService.joinRoom(roomId), {
    onSuccess: () => queryClient.invalidateQueries([QueryKeys.rooms]),
  });
};

export const useSendRoomMessageMutation = (
  roomId: string,
): UseMutationResult<TRoomMessage, unknown, string> => {
  const queryClient = useQueryClient();
  return useMutation((text: string) => dataService.sendRoomMessage(roomId, { text }), {
    onSuccess: (message) =>
      queryClient.setQueryData<TRoomSnapshot>([QueryKeys.room, roomId], (prev) =>
        appendRoomMessage(prev, message),
      ),
  });
};

export const useRoomTypingMutation = (roomId: string): UseMutationResult<void, unknown, void> =>
  useMutation(() => dataService.sendRoomTyping(roomId));

export const useAttachRoomFileMutation = (
  roomId: string,
): UseMutationResult<TRoom, unknown, string> => {
  const queryClient = useQueryClient();
  return useMutation((fileId: string) => dataService.attachRoomFile(roomId, fileId), {
    onSuccess: () => queryClient.invalidateQueries([QueryKeys.room, roomId]),
  });
};

export const useDetachRoomFileMutation = (
  roomId: string,
): UseMutationResult<TRoom, unknown, string> => {
  const queryClient = useQueryClient();
  return useMutation((fileId: string) => dataService.detachRoomFile(roomId, fileId), {
    onSuccess: () => queryClient.invalidateQueries([QueryKeys.room, roomId]),
  });
};

const upsertPoll = (
  snapshot: TRoomSnapshot | undefined,
  poll: TRoomPoll,
): TRoomSnapshot | undefined => {
  if (!snapshot) {
    return snapshot;
  }
  const existing = snapshot.polls.findIndex((p) => p.pollId === poll.pollId);
  if (existing >= 0) {
    const polls = [...snapshot.polls];
    polls[existing] = poll;
    return { ...snapshot, polls };
  }
  return { ...snapshot, polls: [...snapshot.polls, poll] };
};

export const useCreateRoomPollMutation = (
  roomId: string,
): UseMutationResult<TRoomPoll, unknown, TCreateRoomPollRequest> => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: TCreateRoomPollRequest) => dataService.createRoomPoll(roomId, payload),
    {
      onSuccess: (poll) =>
        queryClient.setQueryData<TRoomSnapshot>([QueryKeys.room, roomId], (prev) =>
          upsertPoll(prev, poll),
        ),
    },
  );
};

export const useVoteRoomPollMutation = (
  roomId: string,
): UseMutationResult<TRoomPoll, unknown, TVoteRoomPollRequest & { pollId: string }> => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ pollId, optionIndex }: TVoteRoomPollRequest & { pollId: string }) =>
      dataService.voteRoomPoll(roomId, pollId, { optionIndex }),
    {
      onSuccess: (poll) =>
        queryClient.setQueryData<TRoomSnapshot>([QueryKeys.room, roomId], (prev) =>
          upsertPoll(prev, poll),
        ),
    },
  );
};

export const useCloseRoomPollMutation = (
  roomId: string,
): UseMutationResult<TRoomPoll, unknown, string> => {
  const queryClient = useQueryClient();
  return useMutation((pollId: string) => dataService.closeRoomPoll(roomId, pollId), {
    onSuccess: (poll) =>
      queryClient.setQueryData<TRoomSnapshot>([QueryKeys.room, roomId], (prev) =>
        upsertPoll(prev, poll),
      ),
  });
};

export const useSummarizeRoomMutation = (
  roomId: string,
): UseMutationResult<TSummarizeRoomResponse, unknown, TSummarizeRoomRequest> => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: TSummarizeRoomRequest) => dataService.summarizeRoom(roomId, payload),
    {
      onSuccess: (result) => {
        if (result.message) {
          queryClient.setQueryData<TRoomSnapshot>([QueryKeys.room, roomId], (prev) =>
            appendRoomMessage(prev, result.message as TRoomMessage),
          );
        }
      },
    },
  );
};

export const useArchiveRoomMutation = (): UseMutationResult<TRoom, unknown, string> => {
  const queryClient = useQueryClient();
  return useMutation((roomId: string) => dataService.archiveRoom(roomId), {
    onSuccess: (_room, roomId) => {
      queryClient.invalidateQueries([QueryKeys.room, roomId]);
      queryClient.invalidateQueries([QueryKeys.rooms]);
    },
  });
};
