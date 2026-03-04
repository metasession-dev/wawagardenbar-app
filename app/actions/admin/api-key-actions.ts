'use server';

import { requireSuperAdmin } from '@/lib/auth-middleware';
import { ApiKeyService } from '@/services/api-key-service';
import {
  IApiKeyPublic,
  ICreateApiKeyInput,
} from '@/interfaces/api-key.interface';

interface CreateApiKeyResult {
  success: boolean;
  plainKey?: string;
  apiKey?: IApiKeyPublic;
  error?: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Create a new API key. Returns the plain key once — store it immediately.
 */
export async function createApiKeyAction(
  input: ICreateApiKeyInput
): Promise<CreateApiKeyResult> {
  try {
    const session = await requireSuperAdmin();

    const { plainKey, apiKey } = await ApiKeyService.createKey(
      input,
      session.userId as string
    );

    return { success: true, plainKey, apiKey };
  } catch (error) {
    console.error('[createApiKeyAction]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create API key',
    };
  }
}

/**
 * List all API keys (super-admin only).
 */
export async function listApiKeysAction(): Promise<{
  success: boolean;
  keys?: IApiKeyPublic[];
  error?: string;
}> {
  try {
    await requireSuperAdmin();
    const keys = await ApiKeyService.listKeys({ includeInactive: true });
    return { success: true, keys };
  } catch (error) {
    console.error('[listApiKeysAction]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list API keys',
    };
  }
}

/**
 * Revoke (deactivate) an API key.
 */
export async function revokeApiKeyAction(keyId: string): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    const ok = await ApiKeyService.revokeKey(keyId, session.userId as string);
    if (!ok) return { success: false, error: 'API key not found' };
    return { success: true };
  } catch (error) {
    console.error('[revokeApiKeyAction]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke API key',
    };
  }
}

/**
 * Permanently delete an API key.
 */
export async function deleteApiKeyAction(keyId: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const ok = await ApiKeyService.deleteKey(keyId);
    if (!ok) return { success: false, error: 'API key not found' };
    return { success: true };
  } catch (error) {
    console.error('[deleteApiKeyAction]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete API key',
    };
  }
}

