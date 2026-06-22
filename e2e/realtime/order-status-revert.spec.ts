/**
 * @requirement REQ-083 — Fix completed orders reverting to previous status
 * @requirement SRS REQ-RT-001 — Order status broadcast to subscribers
 *
 * Pins the transport contract for `order:updated`: a client joined to the
 * `orders` or `kitchen-display` room receives the event with a top-level
 * `status` field (not just nested inside `updates.status`).
 *
 * Trigger: UAT's internal-emit endpoint (`POST /api/internal/socket/emit`),
 * gated by `INTERNAL_API_SECRET`. The endpoint's `order-updated` case
 * calls `emitOrderUpdated` (lib/socket-server.ts:226) which broadcasts to
 * both `orders` and `kitchen-display` rooms.
 *
 * Synthetic orderId strings are used — no real Order document is required
 * because `emitOrderUpdated` broadcasts based on the supplied id with no
 * DB lookup.
 */
import { test, expect } from '@playwright/test';
import type { Socket } from 'socket.io-client';
import {
  connectClient,
  waitForEvent,
  disconnectAll,
  triggerInternalEmit,
} from '../helpers/socket-listener';
import { tagTest } from '../helpers/test-tags';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || '';

test.describe.configure({ mode: 'serial' });

test.describe('REQ-083 — order:updated payload carries top-level status (REQ-RT-001)', () => {
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

  test('AC3: orders room receives order:updated with top-level status field', async () => {
    tagTest('REQ-083', 3);
    const orderId = `e2e-req083-${Date.now()}-a`;
    const client = await connectClient(BASE_URL);
    sockets.push(client);

    expect(client.connected).toBe(true);
    client.emit('orders:subscribe');

    const eventPromise = waitForEvent<{
      orderId: string;
      status: string;
      updates: { status: string };
      action: string;
      timestamp: string;
    }>(client, 'order:updated', 5000);

    await triggerInternalEmit(BASE_URL, INTERNAL_SECRET!, 'order-updated', {
      orderId,
      updates: { status: 'preparing' },
      status: 'preparing',
      action: 'status_update',
      updatedBy: 'e2e-req083',
    });

    const payload = await eventPromise;

    expect(payload.orderId).toBe(orderId);
    expect(payload.status).toBe('preparing');
    expect(payload.updates.status).toBe('preparing');
    expect(payload.action).toBe('status_update');
    expect(typeof payload.timestamp).toBe('string');
  });

  test('AC1: kitchen-display room receives order:updated with completed status', async () => {
    tagTest('REQ-083', 1);
    const orderId = `e2e-req083-${Date.now()}-b`;
    const client = await connectClient(BASE_URL);
    sockets.push(client);

    expect(client.connected).toBe(true);
    client.emit('kitchen:subscribe');

    const eventPromise = waitForEvent<{
      orderId: string;
      status: string;
      updates: { status: string };
    }>(client, 'order:updated', 5000);

    await triggerInternalEmit(BASE_URL, INTERNAL_SECRET!, 'order-updated', {
      orderId,
      updates: { status: 'completed' },
      status: 'completed',
      action: 'status_update',
      updatedBy: 'e2e-req083',
    });

    const payload = await eventPromise;

    expect(payload.orderId).toBe(orderId);
    expect(payload.status).toBe('completed');
    expect(payload.updates.status).toBe('completed');
  });

  test('AC5: kitchen-display room receives order:updated with cancelled status', async () => {
    tagTest('REQ-083', 5);
    const orderId = `e2e-req083-${Date.now()}-c`;
    const client = await connectClient(BASE_URL);
    sockets.push(client);

    expect(client.connected).toBe(true);
    client.emit('kitchen:subscribe');

    const eventPromise = waitForEvent<{
      orderId: string;
      status: string;
      updates: { status: string };
    }>(client, 'order:updated', 5000);

    await triggerInternalEmit(BASE_URL, INTERNAL_SECRET!, 'order-updated', {
      orderId,
      updates: { status: 'cancelled' },
      status: 'cancelled',
      action: 'status_update',
      updatedBy: 'e2e-req083',
    });

    const payload = await eventPromise;

    expect(payload.orderId).toBe(orderId);
    expect(payload.status).toBe('cancelled');
    expect(payload.updates.status).toBe('cancelled');
  });

  test('AC2: non-terminal status (preparing) propagates top-level status', async () => {
    tagTest('REQ-083', 2);
    const orderId = `e2e-req083-${Date.now()}-d`;
    const client = await connectClient(BASE_URL);
    sockets.push(client);

    expect(client.connected).toBe(true);
    client.emit('orders:subscribe');

    const eventPromise = waitForEvent<{
      orderId: string;
      status: string;
      updates: { status: string };
    }>(client, 'order:updated', 5000);

    await triggerInternalEmit(BASE_URL, INTERNAL_SECRET!, 'order-updated', {
      orderId,
      updates: { status: 'ready' },
      status: 'ready',
      action: 'status_update',
      updatedBy: 'e2e-req083',
    });

    const payload = await eventPromise;

    expect(payload.orderId).toBe(orderId);
    expect(payload.status).toBe('ready');
    expect(payload.updates.status).toBe('ready');
  });
});
