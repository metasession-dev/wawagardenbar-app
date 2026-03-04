import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/mongodb';
import ApiKeyModel from '@/models/api-key-model';
import {
  IApiKey,
  IApiKeyPublic,
  ICreateApiKeyInput,
  ApiKeyScope,
} from '@/interfaces/api-key.interface';

const BCRYPT_ROUNDS = 10;
const KEY_PREFIX_LENGTH = 8;
const KEY_BYTES = 32;

interface GenerateKeyResult {
  plainKey: string;
  apiKey: IApiKeyPublic;
}

interface ValidateKeyResult {
  valid: boolean;
  apiKey?: IApiKey;
  scopes?: ApiKeyScope[];
}

/**
 * Generate a cryptographically random API key.
 * Format: wawa_{prefix}_{randomHex}
 */
function generateRawKey(): { plainKey: string; prefix: string } {
  const raw = crypto.randomBytes(KEY_BYTES).toString('hex');
  const prefix = `wawa_${raw.slice(0, KEY_PREFIX_LENGTH)}`;
  const plainKey = `${prefix}_${raw.slice(KEY_PREFIX_LENGTH)}`;
  return { plainKey, prefix };
}

function serializeKey(doc: IApiKey): IApiKeyPublic {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    keyPrefix: doc.keyPrefix,
    scopes: doc.scopes,
    createdBy: doc.createdBy.toString(),
    lastUsedAt: doc.lastUsedAt?.toISOString(),
    expiresAt: doc.expiresAt?.toISOString(),
    isActive: doc.isActive,
    rateLimit: doc.rateLimit,
    createdAt: doc.createdAt.toISOString(),
  };
}

export const ApiKeyService = {
  /**
   * Create a new API key. Returns the plain key once — it cannot be retrieved again.
   */
  async createKey(
    input: ICreateApiKeyInput,
    createdByUserId: string
  ): Promise<GenerateKeyResult> {
    await connectDB();

    const { plainKey, prefix } = generateRawKey();
    const keyHash = await bcrypt.hash(plainKey, BCRYPT_ROUNDS);

    const doc = await ApiKeyModel.create({
      name: input.name,
      keyHash,
      keyPrefix: prefix,
      scopes: input.scopes,
      createdBy: createdByUserId,
      expiresAt: input.expiresAt,
      rateLimit: input.rateLimit ?? 60,
      isActive: true,
    });

    return { plainKey, apiKey: serializeKey(doc) };
  },

  /**
   * Validate an incoming raw API key. Returns the key document if valid.
   */
  async validateKey(rawKey: string): Promise<ValidateKeyResult> {
    if (!rawKey || !rawKey.startsWith('wawa_')) {
      return { valid: false };
    }

    await connectDB();

    const prefixMatch = rawKey.slice(0, `wawa_`.length + KEY_PREFIX_LENGTH);

    const candidates = await ApiKeyModel.find({
      keyPrefix: prefixMatch,
      isActive: true,
    }).select('+keyHash');

    for (const candidate of candidates) {
      if (candidate.expiresAt && new Date() > candidate.expiresAt) continue;

      const match = await bcrypt.compare(rawKey, candidate.keyHash);
      if (match) {
        candidate.lastUsedAt = new Date();
        await candidate.save();
        return { valid: true, apiKey: candidate, scopes: candidate.scopes };
      }
    }

    return { valid: false };
  },

  /**
   * List all API keys for a given creator (or all keys for super-admin).
   */
  async listKeys(options?: {
    createdBy?: string;
    includeInactive?: boolean;
  }): Promise<IApiKeyPublic[]> {
    await connectDB();

    const filter: Record<string, unknown> = {};
    if (options?.createdBy) filter.createdBy = options.createdBy;
    if (!options?.includeInactive) filter.isActive = true;

    const docs = await ApiKeyModel.find(filter).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => serializeKey(doc as unknown as IApiKey));
  },

  /**
   * Revoke (deactivate) an API key by ID.
   */
  async revokeKey(keyId: string, _requestingUserId: string): Promise<boolean> {
    await connectDB();

    const doc = await ApiKeyModel.findById(keyId);
    if (!doc) return false;

    doc.isActive = false;
    await doc.save();
    return true;
  },

  /**
   * Delete an API key permanently.
   */
  async deleteKey(keyId: string): Promise<boolean> {
    await connectDB();
    const result = await ApiKeyModel.findByIdAndDelete(keyId);
    return result !== null;
  },
};
