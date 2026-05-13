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
  scopes: ApiKeyScope[];
  expiresAt?: Date;
  rateLimit?: number;
}
