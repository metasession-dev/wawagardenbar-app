/**
 * @requirement REQ-040 — Script hardening: refuse mongodb:// URIs without
 * a database path.
 *
 * D12 (in REQ-034's release ticket) was a near-miss: the prod backfill
 * URI lacked a database path, the Mongo driver silently connected to
 * the default DB, and "0 candidates found" was misread as "the script
 * did its job."
 *
 * This helper is the script-boundary guard: parse the URI, assert the
 * database is named, return it for an explicit `Connecting to database:
 * <name>` log line. On failure, throw with a message naming the env var
 * the operator should set.
 */

export interface ResolvedMongoUri {
  uri: string;
  database: string;
}

const MONGO_URI_RE = /^(mongodb(?:\+srv)?:\/\/)([^/?#]+)(\/[^?#]*)?(\?.*)?$/;

const MISSING_DB_MESSAGE =
  'Mongo URI is missing a database path. Add the database name to the URI ' +
  '(e.g. mongodb://…/wawagardenbar) or set MONGODB_DB_NAME and include it ' +
  'in the connection URL.';

export function assertMongoUriHasDatabase(uri: string): ResolvedMongoUri {
  const match = uri.match(MONGO_URI_RE);
  if (!match) {
    throw new Error('Not a mongodb:// or mongodb+srv:// URI');
  }
  const path = match[3] ?? '';
  const database = path.replace(/^\//, '');
  if (!database) {
    throw new Error(MISSING_DB_MESSAGE);
  }
  return { uri, database };
}
