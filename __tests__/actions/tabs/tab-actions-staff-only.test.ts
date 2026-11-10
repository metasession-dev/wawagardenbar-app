/**
 * @requirement REQ-120 — AC6
 * @srs REQ-TABMGT-011
 *
 * Customer-reachable tab server actions reject customers, guests and signed-out
 * callers; staff keep access.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const session: Record<string, unknown> = {};
vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({}) }));
vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockImplementation(async () => session),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models/tab-model', () => ({ default: {} }));
vi.mock('@/services/audit-log-service', () => ({ AuditLogService: {} }));

const TabService = vi.hoisted(() => ({
  createTab: vi.fn(),
  getOpenTabForTable: vi.fn(),
  getOpenTabForUser: vi.fn(),
  getOpenTabForGuest: vi.fn(),
  getTabDetails: vi.fn(),
  prepareTabForCheckout: vi.fn(),
  listTabsWithFilters: vi.fn(),
}));
vi.mock('@/services', () => ({ TabService }));

import {
  createTabAction,
  getOpenTabForUserAction,
  getOpenTabForTableAction,
  getTabDetailsAction,
  prepareTabForCheckoutAction,
  getFilteredTabsAction,
} from '@/app/actions/tabs/tab-actions';

const calls: Array<
  [string, () => Promise<{ success: boolean; error?: string }>]
> = [
  ['createTabAction', () => createTabAction({ tableNumber: 'T1' })],
  ['getOpenTabForUserAction', () => getOpenTabForUserAction()],
  ['getOpenTabForTableAction', () => getOpenTabForTableAction('T1')],
  ['getTabDetailsAction', () => getTabDetailsAction('tab-1')],
  [
    'prepareTabForCheckoutAction',
    () => prepareTabForCheckoutAction({ tabId: 'tab-1' }),
  ],
  ['getFilteredTabsAction', () => getFilteredTabsAction({})],
];

function setSession(fields: Record<string, unknown>) {
  for (const k of Object.keys(session)) delete session[k];
  Object.assign(session, fields);
}

beforeEach(() => vi.clearAllMocks());

describe.each(calls)('%s', (_name, call) => {
  it('rejects a customer session (US-B2.4)', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    const r = await call();
    expect(r).toEqual({ success: false, error: 'Tabs are managed by staff' });
    for (const fn of Object.values(TabService))
      expect(fn).not.toHaveBeenCalled();
  });

  it('rejects a guest and a signed-out caller', async () => {
    setSession({ isGuest: true, guestId: 'g1' });
    expect((await call()).success).toBe(false);
    setSession({});
    expect((await call()).success).toBe(false);
  });

  it('rejects a kitchen-only staff member', async () => {
    setSession({
      isLoggedIn: true,
      userId: 'k1',
      role: 'kitchen',
      roles: ['kitchen'],
    });
    expect((await call()).success).toBe(false);
  });
});

describe('staff access is unchanged', () => {
  it('lets a csr read the open tab for a table', async () => {
    setSession({ isLoggedIn: true, userId: 's1', role: 'csr', roles: ['csr'] });
    TabService.getOpenTabForTable.mockResolvedValue({ _id: 't' });
    const r = await getOpenTabForTableAction('T1');
    expect(r.success).toBe(true);
    expect(TabService.getOpenTabForTable).toHaveBeenCalledWith('T1');
  });
});
