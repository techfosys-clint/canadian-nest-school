 
import mongoose from 'mongoose';

const DATABASE_URL =
  process.env.DATABASE_URL || 'mongodb://127.0.0.1/canadian-nest-school';

if (!DATABASE_URL) {
  throw new Error(
    'Please define the DATABASE_URL environment variable inside .env.local',
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

/**
 * Register all Mongoose models so that populate() calls never throw
 * "Schema hasn't been registered for model X" errors, regardless of
 * which server file initiates the database connection first.
 */
async function registerModels() {
  // Dynamic import keeps registration lazy and avoids circular-module issues.
  await import('./models');
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose
      .connect(DATABASE_URL, opts)
      .then((mongooseInstance) => {
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
    // Always ensure all models are registered after connecting
    await registerModels();
  } catch (e: any) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
