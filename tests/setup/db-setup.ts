import 'tsconfig-paths/register';
import path from 'node:path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

if (!MONGODB_URI || !MONGODB_DB_NAME) {
  throw new Error('Test database configuration missing (MONGODB_URI / MONGODB_DB_NAME)');
}

async function connect(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI as string, {
      dbName: MONGODB_DB_NAME as string,
      autoIndex: true,
    });
  }

  return mongoose;
}

export async function setupTestDatabase(): Promise<void> {
  await connect();
}

export async function cleanupTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return;
  }

  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function closeTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
