import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // Read environment variables dynamically to support scripts that load .env.local
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_WAWAGARDENBAR_APP_URI;
  const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_WAWAGARDENBAR_APP_URI environment variable');
  }

  if (!MONGODB_DB_NAME) {
    throw new Error('Please define the MONGODB_DB_NAME environment variable');
  }

  // Check if cached connection is still alive (readyState 1 = connected)
  if (cached.conn) {
    const readyState = cached.conn.connection.readyState;
    if (readyState === 1) {
      return cached.conn;
    }
    // Connection is dead or disconnected — reset cache and reconnect
    console.warn(`⚠️ MongoDB connection lost (readyState: ${readyState}), reconnecting...`);
    cached.conn = null;
    cached.promise = null;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
    };
    cached.promise = mongoose.connect(MONGODB_URI as string, opts);
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

export const connectDB = connectToDatabase;
