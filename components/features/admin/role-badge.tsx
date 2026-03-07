import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/interfaces/user.interface';
import { Headset, Shield, ShieldCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: UserRole;
  showIcon?: boolean;
  className?: string;
}

/**
 * Display user role badge with appropriate styling
 */
export function RoleBadge({ role, showIcon = true, className }: RoleBadgeProps) {
  const roleConfig = getRoleConfig(role);

  return (
    <Badge
      variant={roleConfig.variant}
      className={cn(roleConfig.className, className)}
    >
      {showIcon && <roleConfig.icon className="mr-1 h-3 w-3" />}
      {roleConfig.label}
    </Badge>
  );
}

/**
 * Get role configuration for styling and display
 */
function getRoleConfig(role: UserRole) {
  switch (role) {
    case 'super-admin':
      return {
        label: 'Super Admin',
        variant: 'default' as const,
        className: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0',
        icon: ShieldCheck,
      };
    case 'csr':
      return {
        label: 'CSR',
        variant: 'default' as const,
        className: 'bg-teal-600 text-white border-0',
        icon: Headset,
      };
    case 'admin':
      return {
        label: 'Admin',
        variant: 'default' as const,
        className: 'bg-blue-600 text-white border-0',
        icon: Shield,
      };
    case 'customer':
      return {
        label: 'Customer',
        variant: 'secondary' as const,
        className: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
        icon: User,
      };
    default:
      return {
        label: 'Unknown',
        variant: 'outline' as const,
        className: '',
        icon: User,
      };
  }
}
