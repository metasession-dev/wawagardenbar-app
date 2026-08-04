/**
 * @requirement REQ-098 AC3 — writeOffTabAction RBAC gate.
 *
 * Mirrors the inline session-cookie role-gate pattern already covered for
 * `deleteTabAction` (same gate: admin/super-admin only) — see
 * `__tests__/actions/admin/order-management-actions.test.ts`'s
 * `deleteOrderAction role gate` suite for the sibling precedent.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCookies = vi.fn();
const mockGetIronSession = vi.fn();
const mockWriteOffTab = vi.fn();

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}));

vi.mock('iron-session', () => ({
  getIronSession: mockGetIronSession,
}));

vi.mock('@/lib/session', () => ({
  sessionOptions: {},
  SessionData: {},
}));

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/tab-model', () => ({
  default: {},
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {},
}));

vi.mock('@/services', () => ({
  TabService: {
    writeOffTab: (...args: unknown[]) => mockWriteOffTab(...args),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const { writeOffTabAction } = await import('@/app/actions/tabs/tab-actions');

describe('REQ-098 AC3: writeOffTabAction role gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({});
    mockWriteOffTab.mockResolvedValue({ paymentStatus: 'written-off' });
  });

  it('rejects when not logged in', async () => {
    mockGetIronSession.mockResolvedValue({ isLoggedIn: false });

    const result = await writeOffTabAction('tab-1', { reason: 'Dormant.' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unauthorized/i);
    expect(mockWriteOffTab).not.toHaveBeenCalled();
  });

  it('rejects a non-admin/non-super-admin', async () => {
    mockGetIronSession.mockResolvedValue({
      isLoggedIn: true,
      userId: 'csr-1',
      role: 'csr',
    });

    const result = await writeOffTabAction('tab-1', { reason: 'Dormant.' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/insufficient permissions/i);
    expect(mockWriteOffTab).not.toHaveBeenCalled();
  });

  it('rejects a missing/blank reason before calling the service', async () => {
    mockGetIronSession.mockResolvedValue({
      isLoggedIn: true,
      userId: 'admin-1',
      role: 'admin',
    });

    const result = await writeOffTabAction('tab-1', { reason: '   ' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/reason is required/i);
    expect(mockWriteOffTab).not.toHaveBeenCalled();
  });

  it('allows admin to write off a tab', async () => {
    mockGetIronSession.mockResolvedValue({
      isLoggedIn: true,
      userId: 'admin-1',
      role: 'admin',
    });

    const result = await writeOffTabAction('tab-1', {
      reason: 'Dormant since Dec 2025.',
    });

    expect(result.success).toBe(true);
    expect(mockWriteOffTab).toHaveBeenCalledWith('tab-1', {
      reason: 'Dormant since Dec 2025.',
      writtenOffBy: 'admin-1',
    });
  });

  it('allows super-admin to write off a tab', async () => {
    mockGetIronSession.mockResolvedValue({
      isLoggedIn: true,
      userId: 'super-1',
      role: 'super-admin',
    });

    const result = await writeOffTabAction('tab-1', {
      reason: 'Dormant since Dec 2025.',
    });

    expect(result.success).toBe(true);
    expect(mockWriteOffTab).toHaveBeenCalledWith('tab-1', {
      reason: 'Dormant since Dec 2025.',
      writtenOffBy: 'super-1',
    });
  });

  it('surfaces a service-layer error (e.g. already written off)', async () => {
    mockGetIronSession.mockResolvedValue({
      isLoggedIn: true,
      userId: 'admin-1',
      role: 'admin',
    });
    mockWriteOffTab.mockRejectedValue(
      new Error('This tab has already been written off.')
    );

    const result = await writeOffTabAction('tab-1', {
      reason: 'Attempting again.',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already been written off/i);
  });
});
