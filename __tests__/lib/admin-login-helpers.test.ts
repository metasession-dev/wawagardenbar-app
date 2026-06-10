/**
 * @requirement REQ-076 — Per-main-category report + per-user access control
 * @requirement REQ-066 AC10 — incidentsAccess default
 *
 * Pins `buildSessionPermissions` — the session-side copy contract
 * that admin-login.ts uses to copy `admin.permissions` from the DB
 * record onto the iron-session cookie.
 *
 * Source of the REQ-076 production defect this test prevents from
 * recurring: the original action whitelisted boolean fields onto the
 * session but silently dropped `mainCategoryReportAccess` (a string
 * array). Restricted admins logged in with `session.permissions`
 * shaped as if they had no restriction — the downstream
 * `getAllowedMainCategoriesForReports` then routed them to the
 * back-compat see-all-mains branch, silently breaking the RBAC gate.
 *
 * The 9 `getAllowedMainCategoriesForReports` unit tests
 * (`__tests__/lib/permissions.main-category-access.test.ts`) cover the
 * resolution table given a correctly-shaped session. THIS test covers
 * the wire between the DB and the helper — making sure every valid
 * permission field round-trips, defaults are correct, and the field
 * shape preserves the helper's three-state contract
 * (undefined → see all, [] → deny all, [slug] → restricted subset).
 */
import { describe, it, expect } from 'vitest';
import { buildSessionPermissions } from '@/lib/admin-login-helpers';
import type { IAdminPermissions } from '@/interfaces/admin-permissions.interface';

describe('REQ-076 — buildSessionPermissions', () => {
  describe('null / undefined input', () => {
    it('returns undefined for null', () => {
      expect(buildSessionPermissions(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(buildSessionPermissions(undefined)).toBeUndefined();
    });
  });

  describe('boolean permission fields', () => {
    it('copies all 8 standard booleans verbatim when true', () => {
      const raw: Partial<IAdminPermissions> = {
        orderManagement: true,
        menuManagement: true,
        inventoryManagement: true,
        rewardsAndLoyalty: true,
        reportsAndAnalytics: true,
        expensesManagement: true,
        settingsAndConfiguration: true,
        kitchenManagement: true,
        incidentsAccess: true,
      };
      const out = buildSessionPermissions(raw);
      expect(out).toMatchObject({
        orderManagement: true,
        menuManagement: true,
        inventoryManagement: true,
        rewardsAndLoyalty: true,
        reportsAndAnalytics: true,
        expensesManagement: true,
        settingsAndConfiguration: true,
        kitchenManagement: true,
        incidentsAccess: true,
      });
    });

    it('coerces missing booleans to false via !!', () => {
      // Legacy admin doc missing several keys
      const out = buildSessionPermissions({});
      expect(out?.orderManagement).toBe(false);
      expect(out?.menuManagement).toBe(false);
      expect(out?.inventoryManagement).toBe(false);
      expect(out?.rewardsAndLoyalty).toBe(false);
      expect(out?.reportsAndAnalytics).toBe(false);
      expect(out?.expensesManagement).toBe(false);
      expect(out?.settingsAndConfiguration).toBe(false);
      expect(out?.kitchenManagement).toBe(false);
    });

    it('coerces explicit false to false (no accidental true)', () => {
      const out = buildSessionPermissions({
        orderManagement: false,
        menuManagement: false,
      });
      expect(out?.orderManagement).toBe(false);
      expect(out?.menuManagement).toBe(false);
    });
  });

  describe('incidentsAccess (REQ-066 AC10 default-to-true)', () => {
    it('defaults to true when field is missing (pre-AC10 admin)', () => {
      const out = buildSessionPermissions({});
      expect(out?.incidentsAccess).toBe(true);
    });

    it('defaults to true when field is undefined explicitly', () => {
      const out = buildSessionPermissions({ incidentsAccess: undefined });
      expect(out?.incidentsAccess).toBe(true);
    });

    it('respects explicit false', () => {
      const out = buildSessionPermissions({ incidentsAccess: false });
      expect(out?.incidentsAccess).toBe(false);
    });

    it('respects explicit true', () => {
      const out = buildSessionPermissions({ incidentsAccess: true });
      expect(out?.incidentsAccess).toBe(true);
    });
  });

  describe('mainCategoryReportAccess (REQ-076 — load-bearing pass-through)', () => {
    it('omits the field when raw is undefined (back-compat — see all mains)', () => {
      const out = buildSessionPermissions({});
      expect('mainCategoryReportAccess' in (out ?? {})).toBe(false);
    });

    it('omits the field when raw is explicitly undefined', () => {
      const out = buildSessionPermissions({
        mainCategoryReportAccess: undefined,
      });
      expect('mainCategoryReportAccess' in (out ?? {})).toBe(false);
    });

    it('omits the field when raw is null (same as undefined — back-compat)', () => {
      const out = buildSessionPermissions({
        mainCategoryReportAccess:
          null as unknown as IAdminPermissions['mainCategoryReportAccess'],
      });
      expect('mainCategoryReportAccess' in (out ?? {})).toBe(false);
    });

    it('preserves an explicit empty array (deny all)', () => {
      const out = buildSessionPermissions({
        mainCategoryReportAccess: [],
      });
      expect(out?.mainCategoryReportAccess).toEqual([]);
      // Explicitly distinguish [] from undefined — the helper's three-
      // state contract depends on this.
      expect(out?.mainCategoryReportAccess).not.toBeUndefined();
    });

    it('preserves a restricted subset verbatim', () => {
      const out = buildSessionPermissions({
        mainCategoryReportAccess: ['food', 'drinks'],
      });
      expect(out?.mainCategoryReportAccess).toEqual(['food', 'drinks']);
    });

    it('omits a malformed non-array value (defensive — back-compat)', () => {
      // Legacy data shape or hand-edited DB row with the wrong type
      const out = buildSessionPermissions({
        mainCategoryReportAccess:
          'food' as unknown as IAdminPermissions['mainCategoryReportAccess'],
      });
      expect('mainCategoryReportAccess' in (out ?? {})).toBe(false);
    });
  });

  describe('integration — the full permission shape', () => {
    it('round-trips a restricted admin (RBAC regression pin)', () => {
      // The shape of the admin document that produced the REQ-076 prod
      // defect: reportsAndAnalytics enabled + restricted to drinks
      const raw: Partial<IAdminPermissions> = {
        orderManagement: true,
        reportsAndAnalytics: true,
        mainCategoryReportAccess: ['drinks'],
      };
      const out = buildSessionPermissions(raw);
      // Both the gate field AND the restriction MUST land on the
      // session for the downstream helper to enforce restriction.
      expect(out?.reportsAndAnalytics).toBe(true);
      expect(out?.mainCategoryReportAccess).toEqual(['drinks']);
    });

    it('round-trips a back-compat admin (no field present)', () => {
      const raw: Partial<IAdminPermissions> = {
        orderManagement: true,
        reportsAndAnalytics: true,
        // mainCategoryReportAccess intentionally absent
      };
      const out = buildSessionPermissions(raw);
      expect(out?.reportsAndAnalytics).toBe(true);
      expect('mainCategoryReportAccess' in (out ?? {})).toBe(false);
    });

    it('round-trips a deny-all admin (explicit empty)', () => {
      const raw: Partial<IAdminPermissions> = {
        orderManagement: true,
        reportsAndAnalytics: true,
        mainCategoryReportAccess: [],
      };
      const out = buildSessionPermissions(raw);
      expect(out?.mainCategoryReportAccess).toEqual([]);
    });
  });
});
