/**
 * REQ-119 — helpers for specs that need staff members holding specific roles.
 *
 * Every account is throwaway: created in the spec with a unique username,
 * logged in through the real `/admin/login` form in a fresh browser context,
 * and deleted afterwards (with the audit rows it produced). Nothing here
 * touches the shared seeded accounts (`e2e-csr`, `e2e-admin`,
 * `e2e-superadmin`), so role edits can never leak into other specs.
 *
 * Documents are inserted with the raw Mongo driver (the same pattern as
 * `e2e/helpers/customer-auth.ts`), with the permissions a real
 * `AdminService.createAdmin` would give for those roles.
 */
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { withMongo } from './db-assertions';
import { defaultPermissionsForRoles } from '../../lib/permissions';
import { getPrimaryRole } from '../../lib/roles';
import type { StaffRole } from '../../interfaces/user.interface';

export const STAFF_PASSWORD = 'E2eRoles@2026!';

export interface ThrowawayStaff {
  id: string;
  username: string;
  password: string;
  roles: StaffRole[];
}

export function uniqueStaffUsername(prefix: string): string {
  return `e2e-${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`.toLowerCase();
}

/** Insert a staff member holding exactly `roles` (and the union of their default permissions). */
export async function createStaff(
  prefix: string,
  roles: StaffRole[]
): Promise<ThrowawayStaff> {
  const username = uniqueStaffUsername(prefix);
  const now = new Date();
  // Low bcrypt cost: this is a throwaway test credential.
  const password = await bcrypt.hash(STAFF_PASSWORD, 4);
  const id = await withMongo(async (db) => {
    const result = await db.collection('users').insertOne({
      username,
      password,
      email: `${username}@test.wawagardenbar.com`,
      firstName: 'E2E',
      lastName: 'Roles',
      role: getPrimaryRole({ roles }),
      roles,
      isAdmin: true,
      accountStatus: 'active',
      emailVerified: true,
      phoneVerified: false,
      phone: `e2e_roles_${username}`,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      permissions: roles.includes('super-admin')
        ? null
        : defaultPermissionsForRoles(roles),
      createdAt: now,
      updatedAt: now,
    });
    return String(result.insertedId);
  });
  return { id, username, password: STAFF_PASSWORD, roles };
}

/** Delete throwaway staff and any audit rows that name them as actor or target. */
export async function deleteStaff(...ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await withMongo(async (db) => {
    await db
      .collection('users')
      .deleteMany({ _id: { $in: ids.map((id) => new ObjectId(id)) } });
    await db.collection('auditlogs').deleteMany({
      $or: [
        { resourceId: { $in: ids } },
        { userId: { $in: ids.map((id) => new ObjectId(id)) } },
      ],
    });
  });
}

/** Read a staff document. */
export async function readStaff(
  id: string
): Promise<Record<string, any> | null> {
  return withMongo((db) =>
    db.collection('users').findOne({ _id: new ObjectId(id) })
  );
}

/** Audit rows for a role change on `targetId`, oldest first. */
export async function readRoleAuditRows(
  targetId: string
): Promise<Array<Record<string, any>>> {
  return withMongo((db) =>
    db
      .collection('auditlogs')
      .find({ action: 'admin.roles-updated', resourceId: targetId })
      .sort({ createdAt: 1 })
      .toArray()
  );
}

/** Sign a throwaway staff member in through the real admin login form, in a fresh context. */
export async function loginAsStaff(
  browser: Browser,
  staff: Pick<ThrowawayStaff, 'username' | 'password'>
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.fill('#username', staff.username);
  await page.fill('#password', staff.password);
  await page.click('button:has-text("Login")');
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  return { context, page };
}

/** The sidebar link names currently visible. */
export async function visibleNavLinks(page: Page): Promise<string[]> {
  const links = page.locator('nav a');
  await links.first().waitFor({ state: 'visible', timeout: 15000 });
  const names = await links.allInnerTexts();
  return names.map((name) => name.trim()).filter(Boolean);
}

/** True when `path` is not served to this user (redirected elsewhere). */
export async function isRefused(page: Page, path: string): Promise<boolean> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  return new URL(page.url()).pathname !== path;
}
