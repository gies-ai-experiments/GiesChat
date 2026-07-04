import type { ServerResponse } from 'http';

/* ponytail: in-memory registry, single-container deploy; Redis pub/sub if multi-instance */

export type RoomEventName = 'message' | 'ai_delta' | 'presence' | 'typing' | 'poll' | 'room';

interface RoomConnection {
  userId: string;
  res: ServerResponse;
}

const rooms = new Map<string, Set<RoomConnection>>();

function connectionsFor(roomId: string): Set<RoomConnection> {
  let set = rooms.get(roomId);
  if (!set) {
    set = new Set();
    rooms.set(roomId, set);
  }
  return set;
}

function countUserConnections(roomId: string, userId: string): number {
  let count = 0;
  for (const conn of rooms.get(roomId) ?? []) {
    if (conn.userId === userId) {
      count += 1;
    }
  }
  return count;
}

export function publish(roomId: string, event: RoomEventName, data: unknown): void {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const set = rooms.get(roomId);
  if (!set) {
    return;
  }
  for (const conn of set) {
    try {
      conn.res.write(frame);
    } catch {
      set.delete(conn);
    }
  }
  if (set.size === 0) {
    rooms.delete(roomId);
  }
}

export function subscribe(roomId: string, userId: string, res: ServerResponse): () => void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  const conn: RoomConnection = { userId, res };
  const firstConnection = countUserConnections(roomId, userId) === 0;
  connectionsFor(roomId).add(conn);
  if (firstConnection) {
    publish(roomId, 'presence', { userId, online: true });
  }

  return () => {
    const set = rooms.get(roomId);
    if (!set || !set.has(conn)) {
      return;
    }
    set.delete(conn);
    if (set.size === 0) {
      rooms.delete(roomId);
    }
    if (countUserConnections(roomId, userId) === 0) {
      publish(roomId, 'presence', { userId, online: false });
    }
  };
}

export function onlineUserIds(roomId: string): string[] {
  const ids = new Set<string>();
  for (const conn of rooms.get(roomId) ?? []) {
    ids.add(conn.userId);
  }
  return [...ids];
}

export function resetBroadcast(): void {
  rooms.clear();
}
