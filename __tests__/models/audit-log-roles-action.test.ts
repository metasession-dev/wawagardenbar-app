/**
 * @requirement REQ-119 — AC5
 * @srs REQ-AUTHA-006
 *
 * The audit-log schema enumerates its actions; a role change is only recorded
 * if `admin.roles-updated` is in that list (a missing entry makes
 * `AuditLogService.createLog` throw on save). Found by the first real e2e
 * run, so pinned here.
 */
import { describe, it, expect } from 'vitest';
import AuditLogModel from '@/models/audit-log-model';

describe('audit-log model accepts the role-change action (AC5)', () => {
  it('lists admin.roles-updated among the allowed actions', () => {
    const allowed = (
      AuditLogModel.schema.path('action') as unknown as { enumValues: string[] }
    ).enumValues;
    expect(allowed).toContain('admin.roles-updated');
  });

  it('validates a role-change row without throwing', async () => {
    const doc = new AuditLogModel({
      userId: '507f1f77bcf86cd799439011',
      userEmail: 'a@test',
      userRole: 'super-admin',
      action: 'admin.roles-updated',
      resource: 'admin',
      resourceId: 'target',
      details: { before: ['csr'], after: ['csr', 'kitchen'] },
    });
    await expect(doc.validate()).resolves.toBeUndefined();
  });
});
