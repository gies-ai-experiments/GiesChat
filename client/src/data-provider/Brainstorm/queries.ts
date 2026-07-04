import { useQuery } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type { TRoomListItem, TRoomSnapshot } from 'librechat-data-provider';

export const useGetRoomsQuery = (
  config?: UseQueryOptions<TRoomListItem[]>,
): QueryObserverResult<TRoomListItem[]> =>
  useQuery<TRoomListItem[]>([QueryKeys.rooms], () => dataService.getRooms(), {
    refetchOnWindowFocus: false,
    ...config,
  });

export const useGetRoomSnapshotQuery = (
  roomId: string,
  config?: UseQueryOptions<TRoomSnapshot>,
): QueryObserverResult<TRoomSnapshot> =>
  useQuery<TRoomSnapshot>([QueryKeys.room, roomId], () => dataService.getRoomSnapshot(roomId), {
    refetchOnWindowFocus: false,
    retry: false,
    ...config,
  });
