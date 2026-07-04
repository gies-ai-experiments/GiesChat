import { PassThrough } from 'stream';
import type { ServerResponse } from 'http';
import { subscribe, publish, onlineUserIds, resetBroadcast } from './broadcast';

function fakeRes(): { res: ServerResponse; read: () => string } {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (c: Buffer) => chunks.push(c));
  const res = stream as unknown as ServerResponse & { writeHead: () => ServerResponse };
  (res as { writeHead: unknown }).writeHead = () => res;
  return { res, read: () => Buffer.concat(chunks).toString() };
}

beforeEach(() => resetBroadcast());

describe('rooms broadcast', () => {
  it('delivers events to all room connections, not other rooms', () => {
    const a = fakeRes();
    const b = fakeRes();
    const other = fakeRes();
    subscribe('room-1', 'user-a', a.res);
    subscribe('room-1', 'user-b', b.res);
    subscribe('room-2', 'user-c', other.res);

    publish('room-1', 'message', { text: 'hi' });

    expect(a.read()).toContain('event: message');
    expect(a.read()).toContain('"text":"hi"');
    expect(b.read()).toContain('event: message');
    expect(other.read()).not.toContain('event: message');
  });

  it('emits presence on first connect and last disconnect only', () => {
    const watcher = fakeRes();
    subscribe('room-1', 'watcher', watcher.res);

    const tab1 = fakeRes();
    const unsub1 = subscribe('room-1', 'user-a', tab1.res);
    const tab2 = fakeRes();
    const unsub2 = subscribe('room-1', 'user-a', tab2.res);

    const onlineFrames = watcher.read().match(/"online":true/g) ?? [];
    expect(onlineFrames.filter(() => true)).toHaveLength(2); // watcher self + user-a first connect

    unsub1();
    expect(watcher.read()).not.toContain('"online":false');
    unsub2();
    expect(watcher.read()).toContain('"online":false');
    expect(onlineUserIds('room-1')).toEqual(['watcher']);
  });

  it('unsubscribe stops delivery and is idempotent', () => {
    const a = fakeRes();
    const unsub = subscribe('room-1', 'user-a', a.res);
    unsub();
    unsub();
    publish('room-1', 'message', { text: 'after' });
    expect(a.read()).not.toContain('after');
  });

  it('prunes connections whose write throws', () => {
    const dead = fakeRes();
    const alive = fakeRes();
    subscribe('room-1', 'user-a', dead.res);
    subscribe('room-1', 'user-b', alive.res);
    (dead.res as unknown as { write: () => never }).write = () => {
      throw new Error('EPIPE');
    };

    publish('room-1', 'message', { n: 1 });
    publish('room-1', 'message', { n: 2 });

    expect(alive.read()).toContain('"n":2');
    expect(onlineUserIds('room-1')).toEqual(['user-b']);
  });
});
