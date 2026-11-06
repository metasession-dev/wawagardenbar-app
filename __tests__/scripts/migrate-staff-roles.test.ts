/**
 * @requirement REQ-119 — AC4 (ADR-009)
 * @srs REQ-AUTHA-007
 *
 * US-03.3: a pre-migration csr user ends up with roles = ['csr'] and the same
 * access; the migration is idempotent and never touches `role` or customers.
 */
import { describe, it, expect } from 'vitest';
import { planStaffRolesMigration } from '@/lib/staff-roles-migration';
import { getRoles, isAdmin, isSuperAdmin } from '@/lib/session';

const users = [
  { id: '1', role: 'csr' },
  { id: '2', role: 'admin', roles: [] as string[] },
  { id: '3', role: 'super-admin' },
  { id: '4', role: 'customer', roles: [] as string[] },
  { id: '5', role: 'csr', roles: ['csr', 'kitchen'] },
  { id: '6', role: 'bogus' },
  { id: '7', role: 'kitchen' },
];

describe('planStaffRolesMigration (US-03.3)', () => {
  const plan = planStaffRolesMigration(users);

  it('sets roles = [role] for staff users whose roles is empty or missing', () => {
    expect(plan.updates).toEqual([
      { id: '1', role: 'csr', roles: ['csr'] },
      { id: '2', role: 'admin', roles: ['admin'] },
      { id: '3', role: 'super-admin', roles: ['super-admin'] },
      { id: '7', role: 'kitchen', roles: ['kitchen'] },
    ]);
  });

  it('leaves users that already have roles alone', () => {
    expect(plan.alreadyMigrated).toBe(1);
    expect(plan.updates.find((u) => u.id === '5')).toBeUndefined();
  });

  it('never touches customers', () => {
    expect(plan.customers).toBe(1);
    expect(plan.updates.find((u) => u.id === '4')).toBeUndefined();
  });

  it('reports, and does not change, unknown role values', () => {
    expect(plan.unknown).toEqual([{ id: '6', role: 'bogus' }]);
  });

  it('is idempotent: planning again after applying the plan yields no updates', () => {
    const applied = users.map((user) => {
      const update = plan.updates.find((u) => u.id === user.id);
      return update ? { ...user, roles: update.roles } : user;
    });
    const second = planStaffRolesMigration(applied);
    expect(second.updates).toEqual([]);
    expect(second.alreadyMigrated).toBe(5);
  });

  it('never changes role: the plan carries no role rewrite', () => {
    for (const update of plan.updates) {
      const original = users.find((u) => u.id === update.id)!;
      expect(update.role).toBe(original.role);
    }
  });

  it('access is identical before and after (AC4)', () => {
    for (const user of users.filter((u) => u.role !== 'bogus')) {
      const update = plan.updates.find((u) => u.id === user.id);
      const after = update ? { ...user, roles: update.roles } : user;
      expect(getRoles(after)).toEqual(getRoles(user));
      expect(isAdmin(after)).toBe(isAdmin(user));
      expect(isSuperAdmin(after)).toBe(isSuperAdmin(user));
    }
  });

  it('handles an empty collection', () => {
    expect(planStaffRolesMigration([])).toEqual({
      total: 0,
      updates: [],
      alreadyMigrated: 0,
      customers: 0,
      unknown: [],
    });
  });
});
