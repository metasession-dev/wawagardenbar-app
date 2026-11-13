import { Types } from 'mongoose';

export type ApiKeyScope =
  | 'menu:read'
  | 'menu:write'
  | 'orders:read'
  | 'orders:write'
  | 'inventory:read'
  | 'inventory:write'
  | 'customers:read'
  | 'customers:write'
  | 'payments:read'
  | 'payments:write'
  | 'tabs:read'
  | 'tabs:write'
  | 'rewards:read'
  | 'settings:read'
  | 'settings:write'
  | 'analytics:read'
  | 'audit:read';

export type ApiKeyRole = 'customer' | 'csr' | 'admin' | 'super-admin';

export interface IApiKey {
  _id: Types.ObjectId;
  name: string;
  keyHash: string;
  keyPrefix: string;
  role?: ApiKeyRole;
  /** REQ-120 — a customer-role key is bound to the customer it orders for. */
  userId?: Types.ObjectId;
  scopes: ApiKeyScope[];
  createdBy: Types.ObjectId;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  rateLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApiKeyPublic {
  _id: string;
  name: string;
  keyPrefix: string;
  role?: ApiKeyRole;
  userId?: string;
  scopes: ApiKeyScope[];
  createdBy: string;
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  rateLimit: number;
  createdAt: string;
}

export interface ICreateApiKeyInput {
  name: string;
  role?: ApiKeyRole;
  /** Required for (and only allowed with) the customer role. */
  userId?: string;
  scopes: ApiKeyScope[];
  expiresAt?: Date;
  rateLimit?: number;
}
