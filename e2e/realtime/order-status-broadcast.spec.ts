/**
 * @requirement REQ-072 — Real-time Socket.IO broadcast E2E coverage (sub-issue #295)
 * @requirement SRS REQ-RT-001 — Order status broadcast to subscribers
 *
 * Pins the transport contract for `order-status-update`: a client joined to
 * `order-${orderId}` receives the event with the new status payload within
 * 5 seconds of the server-side emission.
 *
 * Trigger: UAT's internal-emit endpoint (`POST /api/internal/socket/emit`),
 * gated by `INTERNAL_API_SECRET`. The endpoint's `order-status-update` case
 * calls `emitOrderStatusUpdate` (lib/socket-server.ts:108) directly.
 *
 * Synthetic orderId strings are used — no real Order document is required
 * because `emitOrderStatusUpdate` broadcasts based on the supplied id with no
 * DB lookup.
 */
import { test, expect } from '@playwright/test';
import type { Socket } from 'socket.io-client';
import {
  connectClient,
  joinOrderRoom,
  waitForEvent,
  disconnectAll,
  triggerInternalEmit,
} from '../helpers/socket-listener';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || '';

test.describe.configure({ mode: 'serial' });

test.describe('REQ-072 — order-status-update broadcast (REQ-RT-001)', () => {
  const sockets: Socket[] = [];

  test.beforeAll(() => {
    if (!INTERNAL_SECRET) {
      test.skip(
        true,
        'INTERNAL_API_SECRET must be set in the environment to drive the internal-emit endpoint. ' +
          'The spec reads from process.env.INTERNAL_API_SECRET and the target server must accept the same value.'
      );
    }
  });

  test.afterAll(() => {
    disconnectAll(sockets);
  });

  test('AC1+AC2: client joined to order room receives order-status-update event within 5s', async () => {
    const orderId = `e2e-req072-${Date.now()}-a`;
    const client = await connectClient(BASE_URL);
    sockets.push(client);

    expect(client.connected).toBe(true);

    await joinOrderRoom(client, orderId);

    const eventPromise = waitForEvent<{
      orderId: string;
      status: string;
      timestamp: string;
      estimatedWaitTime?: number;
      note?: string;
    }>(client, 'order-status-update', 5000);

    await triggerInternalEmit(
      BASE_URL,
      INTERNAL_SECRET!,
      'order-status-update',
      {
        orderId,
        status: 'in-progress',
        estimatedTime: 15,
        note: 'e2e-req072',
      }
    );

    const payload = await eventPromise;

    expect(payload).toMatchObject({
      orderId,
      status: 'in-progress',
    });
    expect(typeof payload.timestamp).toBe('string');
    expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date');
  });

  test('AC3: client joined to a DIFFERENT order room does NOT receive the event', async () => {
    const orderIdEmitted = `e2e-req072-${Date.now()}-b-emitted`;
    const orderIdListening = `e2e-req072-${Date.now()}-b-other`;

    const client = await connectClient(BASE_URL);
    sockets.push(client);

    await joinOrderRoom(client, orderIdListening);

    let received = false;
    const handler = () => {
      received = true;
    };
    client.on('order-status-update', handler);

    await triggerInternalEmit(
      BASE_URL,
      INTERNAL_SECRET!,
      'order-status-update',
      {
        orderId: orderIdEmitted,
        status: 'ready',
        note: 'e2e-req072-isolation',
      }
    );

    await new Promise((r) => setTimeout(r, 1500));
    client.off('order-status-update', handler);

    expect(received).toBe(false);
  });

  test('AC2 extended: payload contains every field emitOrderStatusUpdate sets', async () => {
    const orderId = `e2e-req072-${Date.now()}-c`;
    const client = await connectClient(BASE_URL);
    sockets.push(client);

    await joinOrderRoom(client, orderId);

    const eventPromise = waitForEvent<{
      orderId: string;
      status: string;
      estimatedWaitTime?: number;
      note?: string;
      timestamp: string;
    }>(client, 'order-status-update', 5000);

    await triggerInternalEmit(
      BASE_URL,
      INTERNAL_SECRET!,
      'order-status-update',
      {
        orderId,
        status: 'completed',
        estimatedTime: 0,
        note: 'final-state',
      }
    );

    const payload = await eventPromise;

    expect(payload.orderId).toBe(orderId);
    expect(payload.status).toBe('completed');
    expect(payload.estimatedWaitTime).toBe(0);
    expect(payload.note).toBe('final-state');
    expect(typeof payload.timestamp).toBe('string');
  });
});
