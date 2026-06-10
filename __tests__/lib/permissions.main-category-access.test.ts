/**
 * @requirement REQ-076 — Per-main-category report + per-user access control
 * @requirement SRS REQ-MENUMGT-006
 *
 * Pins the resolution table of `getAllowedMainCategoriesForReports`.
 * Every row of the documented table in `lib/permissions.ts` has at
 * least one case here.
 */
import { describe, it, expect } from 'vitest';
import { getAllowedMainCategoriesForReports } from '@/lib/permissions';
import type { SessionData } from '@/lib/session';
import type { IAdminPermissions } from '@/interfaces';

const ALL_MAINS = ['food', 'drinks', 'snacks'];

function session(
  role: 'csr' | 'admin' | 'super-admin' | undefined,
  permissions?: Partial<IAdminPermissions>
): SessionData {
  return {
    role,
    permissions: permissions as IAdminPermissions | undefined,
  } as SessionData;
}

describe('REQ-076 — getAllowedMainCategoriesForReports', () => {
  it('null session returns empty array', () => {
    expect(getAllowedMainCategoriesForReports(null, ALL_MAINS)).toEqual([]);
  });

  it('session without role returns empty array', () => {
    expect(
      getAllowedMainCategoriesForReports(session(undefined), ALL_MAINS)
    ).toEqual([]);
  });

  it('super-admin sees all registered mains, ignoring permission field', () => {
    // Even when explicitly set to [] — super-admin bypass prevents
    // accidental operator lockout.
    expect(
      getAllowedMainCategoriesForReports(
        session('super-admin', { mainCategoryReportAccess: [] }),
        ALL_MAINS
      )
    ).toEqual(ALL_MAINS);

    expect(
      getAllowedMainCategoriesForReports(
        session('super-admin', { mainCategoryReportAccess: ['food'] }),
        ALL_MAINS
      )
    ).toEqual(ALL_MAINS);

    // No permissions at all → still see everything.
    expect(
      getAllowedMainCategoriesForReports(session('super-admin'), ALL_MAINS)
    ).toEqual(ALL_MAINS);
  });

  it('non-super-admin with reportsAndAnalytics:false returns []', () => {
    expect(
      getAllowedMainCategoriesForReports(
        session('admin', {
          reportsAndAnalytics: false,
          mainCategoryReportAccess: ['food'], // would otherwise allow food
        }),
        ALL_MAINS
      )
    ).toEqual([]);
  });

  it('admin with mainCategoryReportAccess undefined returns all (back-compat)', () => {
    expect(
      getAllowedMainCategoriesForReports(
        session('admin', {
          reportsAndAnalytics: true,
          // mainCategoryReportAccess omitted on purpose
        }),
        ALL_MAINS
      )
    ).toEqual(ALL_MAINS);
  });

  it('admin with mainCategoryReportAccess empty array returns []', () => {
    expect(
      getAllowedMainCategoriesForReports(
        session('admin', {
          reportsAndAnalytics: true,
          mainCategoryReportAccess: [],
        }),
        ALL_MAINS
      )
    ).toEqual([]);
  });

  it('admin with mainCategoryReportAccess subset returns the subset ∩ registered', () => {
    expect(
      getAllowedMainCategoriesForReports(
        session('admin', {
          reportsAndAnalytics: true,
          mainCategoryReportAccess: ['drinks', 'food'],
        }),
        ALL_MAINS
      )
    ).toEqual(['drinks', 'food']);
  });

  it('admin with mainCategoryReportAccess including an unregistered slug filters that slug out', () => {
    // 'snacks' was deleted from the registry; the permission still
    // references it. The helper silently drops it.
    expect(
      getAllowedMainCategoriesForReports(
        session('admin', {
          reportsAndAnalytics: true,
          mainCategoryReportAccess: ['food', 'desserts', 'snacks'],
        }),
        ['food', 'drinks'] // registry no longer has snacks or desserts
      )
    ).toEqual(['food']);
  });

  it('csr with reportsAndAnalytics:true behaves the same as admin', () => {
    // CSR can opt into reports via the existing permission; the per-main
    // gate then layers on the same way.
    expect(
      getAllowedMainCategoriesForReports(
        session('csr', {
          reportsAndAnalytics: true,
          mainCategoryReportAccess: ['drinks'],
        }),
        ALL_MAINS
      )
    ).toEqual(['drinks']);
  });
});
