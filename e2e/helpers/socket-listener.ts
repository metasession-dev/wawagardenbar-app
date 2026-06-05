import { io, Socket } from 'socket.io-client';

/**
 * Connect a `socket.io-client` to the given URL using the same options the
 * production client uses (`lib/socket-client.ts`). Resolves once the `connect`
 * event has fired; rejects if `connect_error` fires or the timeout elapses.
 */
export function connectClient(url: string, timeoutMs = 5000): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      path: '/api/socket',
      autoConnect: true,
      reconnection: false,
      transports: ['websocket', 'polling'],
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(
        new Error(`socket.io-client failed to connect within ${timeoutMs}ms`)
      );
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error(`socket.io-client connect_error: ${err.message}`));
    });
  });
}

/**
 * Join an order-specific room. The server-side handler in
 * `lib/socket-server.ts:39` accepts `join-order` with an orderId payload.
 * Returns once the next-tick fires (server emits no ack).
 */
export function joinOrderRoom(socket: Socket, orderId: string): Promise<void> {
  return new Promise((resolve) => {
    socket.emit('join-order', orderId);
    setTimeout(resolve, 100);
  });
}

/**
 * Register a one-shot listener for `eventName`. Resolves with the event payload
 * if it arrives within `timeoutMs`; rejects with a clear message otherwise.
 */
export function waitForEvent<T = unknown>(
  socket: Socket,
  eventName: string,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(
        new Error(`Timed out waiting for "${eventName}" after ${timeoutMs}ms`)
      );
    }, timeoutMs);

    const handler = (payload: T) => {
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve(payload);
    };

    socket.on(eventName, handler);
  });
}

/**
 * Disconnect every socket passed in. Safe to call multiple times.
 */
export function disconnectAll(sockets: Socket[]): void {
  for (const s of sockets) {
    if (s.connected) s.disconnect();
  }
}

/**
 * Trigger UAT's internal-emit endpoint. Caller must pass the UAT
 * `INTERNAL_API_SECRET` value as `secret`. Throws on non-2xx.
 */
export async function triggerInternalEmit(
  baseUrl: string,
  secret: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/internal/socket/emit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-auth': secret,
    },
    body: JSON.stringify({ event, data }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Internal emit failed: ${res.status} ${body}`);
  }
}
