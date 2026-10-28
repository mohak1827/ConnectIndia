import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGO_URI, {
      autoIndex: true,
    });
    console.log(`Database Connected successfully`);
  } catch (err) {
    console.error('[Database] Connection failed:', err.message);
    process.exit(1);
  }
}
