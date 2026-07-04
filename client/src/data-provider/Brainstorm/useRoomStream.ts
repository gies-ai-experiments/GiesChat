import { SSE } from 'sse.js';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys, roomStream } from 'librechat-data-provider';
import type {
  TRoomMessage,
  TRoomSnapshot,
  TRoomTypingEvent,
  TRoomAiDeltaEvent,
  TRoomPresenceEvent,
} from 'librechat-data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { appendRoomMessage } from './mutations';

const TYPING_CLEAR_MS = 3000;
const MAX_BACKOFF_MS = 30000;

export default function useRoomStream(roomId: string, enabled: boolean): TRoomTypingEvent[] {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<TRoomTypingEvent[]>([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!enabled || !token || roomId === '') {
      return;
    }

    let closed = false;
    let sse: SSE | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = 1000;
    let everConnected = false;
    const timers = typingTimers.current;

    const setSnapshot = (updater: (prev: TRoomSnapshot | undefined) => TRoomSnapshot | undefined) =>
      queryClient.setQueryData<TRoomSnapshot>([QueryKeys.room, roomId], updater);

    const connect = () => {
      if (closed) {
        return;
      }
      sse = new SSE(roomStream(roomId), {
        headers: { Authorization: `Bearer ${token}` },
        method: 'GET',
      });

      sse.addEventListener('open', () => {
        backoff = 1000;
        if (everConnected) {
          /* gap fill after a drop: reload the snapshot */
          queryClient.invalidateQueries([QueryKeys.room, roomId]);
        }
        everConnected = true;
      });

      sse.addEventListener('message', (e: MessageEvent) => {
        const message = JSON.parse(e.data) as TRoomMessage;
        setSnapshot((prev) => appendRoomMessage(prev, message));
      });

      sse.addEventListener('ai_delta', (e: MessageEvent) => {
        const { messageId, delta } = JSON.parse(e.data) as TRoomAiDeltaEvent;
        setSnapshot((prev) => {
          if (!prev) {
            return prev;
          }
          const messages = prev.messages.map((m) =>
            m.messageId === messageId ? { ...m, text: m.text + delta } : m,
          );
          return { ...prev, messages };
        });
      });

      sse.addEventListener('presence', (e: MessageEvent) => {
        const { userId, online } = JSON.parse(e.data) as TRoomPresenceEvent;
        setSnapshot((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.userId === userId ? { ...p, online } : p,
            ),
          };
        });
      });

      sse.addEventListener('typing', (e: MessageEvent) => {
        const event = JSON.parse(e.data) as TRoomTypingEvent;
        setTypingUsers((prev) =>
          prev.some((t) => t.userId === event.userId) ? prev : [...prev, event],
        );
        const existing = timers.get(event.userId);
        if (existing) {
          clearTimeout(existing);
        }
        timers.set(
          event.userId,
          setTimeout(() => {
            timers.delete(event.userId);
            setTypingUsers((prev) => prev.filter((t) => t.userId !== event.userId));
          }, TYPING_CLEAR_MS),
        );
      });

      sse.addEventListener('poll', () => {
        queryClient.invalidateQueries([QueryKeys.room, roomId]);
      });

      sse.addEventListener('error', () => {
        sse?.close();
        if (closed) {
          return;
        }
        reconnectTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      });

      sse.stream();
    };

    connect();

    return () => {
      closed = true;
      sse?.close();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
      setTypingUsers([]);
    };
  }, [roomId, enabled, token, queryClient]);

  return typingUsers;
}
