/**
 * @requirement REQ-119 — AC3
 * @srs REQ-AUTHA-006
 *
 * US-03.2u: the role checkboxes mirror the server rule. For an actor who is
 * not a super-admin, `admin` and `super-admin` are disabled and the other
 * roles are enabled; for a super-admin all five are enabled. (The server
 * refuses the grant regardless: see admin-service.roles.test.ts.)
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoleCheckboxes } from '@/components/features/admin/role-checkboxes';
import { STAFF_ROLES } from '@/interfaces/user.interface';

function render(canGrantPrivileged: boolean, value: string[] = []): string {
  return renderToStaticMarkup(
    createElement(RoleCheckboxes, {
      value: value as never,
      onChange: () => undefined,
      canGrantPrivileged,
      idPrefix: 't',
    })
  );
}

/** True when the tag carries the `disabled` attribute (not the tailwind `disabled:` class). */
const DISABLED_ATTR = /\sdisabled(="[^"]*"|\s|>)/;

/** The `<button ...>` tag that is the checkbox for a role. */
function checkboxFor(html: string, role: string): string {
  const match = html.match(new RegExp(`<button[^>]*id="t-${role}"[^>]*>`));
  expect(match, `checkbox for ${role}`).not.toBeNull();
  return match![0];
}

describe('RoleCheckboxes (US-03.2u)', () => {
  it('renders one checkbox per staff role', () => {
    const html = render(true);
    for (const role of STAFF_ROLES) {
      checkboxFor(html, role);
    }
  });

  it('for a non-super-admin actor, admin and super-admin are disabled and the rest are enabled', () => {
    const html = render(false);
    expect(checkboxFor(html, 'admin')).toMatch(DISABLED_ATTR);
    expect(checkboxFor(html, 'super-admin')).toMatch(DISABLED_ATTR);
    for (const role of ['csr', 'kitchen', 'manager']) {
      expect(checkboxFor(html, role)).not.toMatch(DISABLED_ATTR);
    }
    expect(html).toContain('only a super-admin can grant this');
  });

  it('for a super-admin actor, every role is enabled', () => {
    const html = render(true);
    for (const role of STAFF_ROLES) {
      expect(checkboxFor(html, role)).not.toMatch(DISABLED_ATTR);
    }
    expect(html).not.toContain('only a super-admin can grant this');
  });

  it('reflects the current selection', () => {
    const html = render(true, ['csr', 'kitchen']);
    expect(checkboxFor(html, 'csr')).toMatch(/data-state="checked"/);
    expect(checkboxFor(html, 'kitchen')).toMatch(/data-state="checked"/);
    expect(checkboxFor(html, 'manager')).toMatch(/data-state="unchecked"/);
  });
});
