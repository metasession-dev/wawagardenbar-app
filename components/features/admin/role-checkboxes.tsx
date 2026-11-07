'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { STAFF_ROLES, type StaffRole } from '@/interfaces/user.interface';

/**
 * REQ-119 (AC3) — staff role checkboxes, shared by the create and edit-roles
 * dialogs. `admin` and `super-admin` are disabled unless the actor is a
 * super-admin; the server enforces the same rule (`AdminService.updateRoles`).
 */
export const ROLE_OPTIONS: Record<
  StaffRole,
  { label: string; description: string }
> = {
  csr: {
    label: 'Customer Service Rep',
    description: 'Order management, customer communication, support',
  },
  kitchen: {
    label: 'Kitchen',
    description: 'View orders, advance their status, kitchen display',
  },
  manager: {
    label: 'Manager',
    description: 'Everything a CSR has, plus reports and incidents',
  },
  admin: {
    label: 'Admin',
    description: 'Customizable permissions for specific features',
  },
  'super-admin': {
    label: 'Super Admin',
    description: 'Full access to all dashboard features',
  },
};

const PRIVILEGED: readonly StaffRole[] = ['admin', 'super-admin'];

interface RoleCheckboxesProps {
  value: StaffRole[];
  onChange: (roles: StaffRole[]) => void;
  /** True when the signed-in actor is a super-admin. */
  canGrantPrivileged: boolean;
  disabled?: boolean;
  idPrefix?: string;
}

export function RoleCheckboxes({
  value,
  onChange,
  canGrantPrivileged,
  disabled,
  idPrefix = 'role',
}: RoleCheckboxesProps) {
  const toggle = (role: StaffRole, checked: boolean) => {
    const next = checked
      ? [...value, role]
      : value.filter((existing) => existing !== role);
    onChange(STAFF_ROLES.filter((r) => next.includes(r)));
  };

  return (
    <div className="space-y-3" role="group" aria-label="Roles">
      {STAFF_ROLES.map((role) => {
        const privileged = PRIVILEGED.includes(role);
        const locked = disabled || (privileged && !canGrantPrivileged);
        const id = `${idPrefix}-${role}`;
        return (
          <div key={role} className="flex items-start gap-3">
            <Checkbox
              id={id}
              checked={value.includes(role)}
              disabled={locked}
              onCheckedChange={(checked) => toggle(role, checked === true)}
            />
            <div className="space-y-0.5">
              <Label htmlFor={id}>{ROLE_OPTIONS[role].label}</Label>
              <p className="text-xs text-muted-foreground">
                {ROLE_OPTIONS[role].description}
                {privileged && !canGrantPrivileged
                  ? ' (only a super-admin can grant this)'
                  : ''}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
