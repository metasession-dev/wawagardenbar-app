import { Types } from 'mongoose';

export type ApiKeyScope =
  | 'menu:read'
  | 'orders:read'
  | 'orders:write'
  | 'inventory:read'
  | 'inventory:write'
  | 'customers:read'
  | 'customers:write'
  | 'payments:read'
  | 'payments:write'
  | 'rewards:read'
  | 'settings:read'
  | 'analytics:read';

export interface IApiKey {
  _id: Types.ObjectId;
  name: string;
  keyHash: string;
  keyPrefix: string;
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
  scopes: ApiKeyScope[];
  expiresAt?: Date;
  rateLimit?: number;
}
