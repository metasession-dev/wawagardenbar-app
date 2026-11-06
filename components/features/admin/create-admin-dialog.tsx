'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@/lib/zod';
import { createAdminAction } from '@/app/actions/admin/admin-management-actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionsEditor } from './permissions-editor';
import { IAdminPermissions } from '@/interfaces';
import { STAFF_ROLES, type StaffRole } from '@/interfaces/user.interface';
import { defaultPermissionsForRoles } from '@/lib/permissions';
import { RoleCheckboxes } from './role-checkboxes';

const createAdminSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(
        /^[a-z0-9_-]+$/,
        'Username can only contain lowercase letters, numbers, hyphens, and underscores'
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[^A-Za-z0-9]/,
        'Password must contain at least one special character'
      ),
    confirmPassword: z.string(),
    email: z
      .string()
      .email('Invalid email address')
      .optional()
      .or(z.literal('')),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    roles: z
      .array(z.enum(STAFF_ROLES as [StaffRole, ...StaffRole[]]))
      .min(1, 'Select at least one role'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type CreateAdminFormData = z.infer<typeof createAdminSchema>;

interface CreateAdminDialogProps {
  children: React.ReactNode;
  /** True when the signed-in actor is a super-admin (default: the page is super-admin only). */
  canGrantPrivileged?: boolean;
}

export function CreateAdminDialog({
  children,
  canGrantPrivileged = true,
}: CreateAdminDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<IAdminPermissions>(
    defaultPermissionsForRoles(['admin'])
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateAdminFormData>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      roles: ['admin'],
    },
  });

  const roles = watch('roles') ?? [];
  const hasPermissionRoles = roles.some((role) => role !== 'super-admin');

  const onSubmit = async (data: CreateAdminFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await createAdminAction({
        username: data.username,
        password: data.password,
        email: data.email || undefined,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        roles: data.roles,
        permissions: data.roles.includes('super-admin')
          ? undefined
          : permissions,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      toast.success('Admin created successfully');
      setOpen(false);
      reset();

      // Reload page to refresh admin list
      window.location.reload();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Admin User</DialogTitle>
          <DialogDescription>
            Create a new admin user account with username and password
            authentication.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">
              Username <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="admin_username"
              disabled={isLoading}
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, hyphens, and underscores only
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              disabled={isLoading}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name (Optional)</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              disabled={isLoading}
              {...register('firstName')}
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name (Optional)</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              disabled={isLoading}
              {...register('lastName')}
            />
          </div>

          {/* Roles (REQ-119: one or more) */}
          <div className="space-y-2">
            <Label>
              Roles <span className="text-destructive">*</span>
            </Label>
            <RoleCheckboxes
              value={roles}
              onChange={(next) => {
                setValue('roles', next, { shouldValidate: true });
                setPermissions(defaultPermissionsForRoles(next));
              }}
              canGrantPrivileged={canGrantPrivileged}
              disabled={isLoading}
              idPrefix="create-role"
            />
            {errors.roles && (
              <p className="text-sm text-destructive">
                {errors.roles.message as string}
              </p>
            )}
          </div>

          {/* Permissions: everyone except a super-admin (full access). */}
          {hasPermissionRoles && !roles.includes('super-admin') && (
            <div className="space-y-2">
              <Label>Permissions</Label>
              <p className="text-xs text-muted-foreground mb-4">
                Starts as the combination of the roles above; adjust per feature
                if needed
              </p>
              <PermissionsEditor
                permissions={permissions}
                onChange={setPermissions}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Admin'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
