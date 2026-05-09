/**
 * @requirement REQ-034 — AC4
 * New roles kitchen / bar / waiting in enum.
 * Kitchen: default-deny allowlist on /dashboard/kitchen/*.
 * Bar/waiting: csr-equivalent.
 *
 * STUB: filled in during Phase A tests-first commit.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 AC4 — kitchen/bar/waiting roles', () => {
  describe('role enum', () => {
    it('UserRole includes kitchen | bar | waiting', () => {});
    it('ApiKeyRole includes kitchen | bar | waiting', () => {});
  });

  describe('kitchen default-deny allowlist', () => {
    it('allows /dashboard/kitchen/recipes', () => {});
    it('allows /dashboard/kitchen/production', () => {});
    it('denies /dashboard/orders/*', () => {});
    it('denies /dashboard/customers/*', () => {});
    it('denies /dashboard/finance/*', () => {});
    it('denies /dashboard/settings/*', () => {});
    it('denies /dashboard/inventory/*', () => {});
  });

  describe('bar csr-equivalent', () => {
    it('allows orders sections (csr-permitted)', () => {});
    it('denies admin-only sections', () => {});
  });

  describe('waiting csr-equivalent', () => {
    it('allows orders sections (csr-permitted)', () => {});
    it('denies admin-only sections', () => {});
  });
});
