import { ApiKeyScope, ApiKeyRole } from '@/interfaces/api-key.interface';

export const API_KEY_SCOPE_LABELS: Record<ApiKeyScope, string> = {
  'menu:read': 'Menu — Read',
  'orders:read': 'Orders — Read',
  'orders:write': 'Orders — Write',
  'inventory:read': 'Inventory — Read',
  'inventory:write': 'Inventory — Write',
  'customers:read': 'Customers — Read',
  'customers:write': 'Customers — Write',
  'payments:read': 'Payments — Read',
  'payments:write': 'Payments — Write',
  'tabs:read': 'Tabs — Read',
  'tabs:write': 'Tabs — Write',
  'rewards:read': 'Rewards — Read',
  'settings:read': 'Settings — Read',
  'analytics:read': 'Analytics — Read',
};

export const API_KEY_ROLE_SCOPES: Record<ApiKeyRole, ApiKeyScope[]> = {
  customer: [
    'menu:read',
    'orders:read',
    'orders:write',
    'payments:read',
    'payments:write',
    'rewards:read',
    'tabs:read',
  ],
  csr: [
    'menu:read',
    'orders:read',
    'orders:write',
    'customers:read',
    'customers:write',
    'payments:read',
    'payments:write',
    'rewards:read',
    'tabs:read',
    'tabs:write',
  ],
  admin: [
    'menu:read',
    'orders:read',
    'orders:write',
    'customers:read',
    'customers:write',
    'payments:read',
    'payments:write',
    'rewards:read',
    'tabs:read',
    'tabs:write',
    'inventory:read',
    'analytics:read',
  ],
  'super-admin': [
    'menu:read',
    'orders:read',
    'orders:write',
    'inventory:read',
    'inventory:write',
    'customers:read',
    'customers:write',
    'payments:read',
    'payments:write',
    'tabs:read',
    'tabs:write',
    'rewards:read',
    'settings:read',
    'analytics:read',
  ],
};

export const API_KEY_ROLE_LABELS: Record<ApiKeyRole, string> = {
  customer: 'Customer',
  csr: 'Customer Service',
  admin: 'Admin',
  'super-admin': 'Super Admin',
};

export const API_KEY_ROLE_DESCRIPTIONS: Record<ApiKeyRole, string> = {
  customer: 'Menu browsing, ordering, payments, and rewards',
  csr: 'Orders, customers, payments, rewards, and tab management',
  admin: 'Customer scopes plus tabs, inventory reads, customers, and analytics',
  'super-admin': 'Full access to all API scopes',
};
