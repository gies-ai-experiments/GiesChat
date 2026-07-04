import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
  TRoom,
  TRoomMessage,
  TRoomSnapshot,
  TJoinRoomResponse,
  TCreateRoomRequest,
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

export const useCreateRoomMutation = (): UseMutationResult<
  TRoom,
  unknown,
  TCreateRoomRequest
> => {
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

export const useArchiveRoomMutation = (roomId: string): UseMutationResult<TRoom, unknown, void> => {
  const queryClient = useQueryClient();
  return useMutation(() => dataService.archiveRoom(roomId), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.room, roomId]);
      queryClient.invalidateQueries([QueryKeys.rooms]);
    },
  });
};
