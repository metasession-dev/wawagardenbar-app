import { ApiKeyScope } from '@/interfaces/api-key.interface';

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
  'rewards:read': 'Rewards — Read',
  'settings:read': 'Settings — Read',
  'analytics:read': 'Analytics — Read',
};
