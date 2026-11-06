import { STAFF_ROLES, type StaffRole } from '@/interfaces/user.interface';

/**
 * REQ-119 (AC4, ADR-009) — plan the one-time staff roles migration.
 *
 * For every non-customer user whose `roles` is empty or missing, `roles`
 * becomes `[role]`. `role` is never changed, users that already have `roles`
 * are left alone, and customers (and unknown roles) are never touched, so
 * running the plan twice gives the same result.
 */
export interface StaffRoleMigrationInput {
  id: string;
  role?: string | null;
  roles?: readonly string[] | null;
}

export interface StaffRoleMigrationPlan {
  total: number;
  /** Users that will get `roles = [role]`. */
  updates: Array<{ id: string; role: StaffRole; roles: StaffRole[] }>;
  alreadyMigrated: number;
  customers: number;
  /** Non-customer users whose `role` is not a known staff role; reported, not changed. */
  unknown: Array<{ id: string; role: string | null | undefined }>;
}

export function planStaffRolesMigration(
  users: readonly StaffRoleMigrationInput[]
): StaffRoleMigrationPlan {
  const plan: StaffRoleMigrationPlan = {
    total: users.length,
    updates: [],
    alreadyMigrated: 0,
    customers: 0,
    unknown: [],
  };

  for (const user of users) {
    if (user.role === 'customer' || user.role == null) {
      if (user.role === 'customer') {
        plan.customers += 1;
      } else {
        plan.unknown.push({ id: user.id, role: user.role });
      }
      continue;
    }
    if ((user.roles ?? []).length > 0) {
      plan.alreadyMigrated += 1;
      continue;
    }
    if (STAFF_ROLES.includes(user.role as StaffRole)) {
      const role = user.role as StaffRole;
      plan.updates.push({ id: user.id, role, roles: [role] });
    } else {
      plan.unknown.push({ id: user.id, role: user.role });
    }
  }

  return plan;
}
