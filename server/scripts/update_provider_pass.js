import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';

async function run() {
  await mongoose.connect(env.MONGO_URI);
  const hash = await bcrypt.hash('DemoPassword123!', 10);
  const updated = await User.findOneAndUpdate(
    { email: 'madhav@insurance.com' },
    { $set: { passwordHash: hash, status: 'active' } },
    { new: true }
  );
  console.log('Updated user:', updated?.email, 'Role:', updated?.role, 'Status:', updated?.status);
  await mongoose.disconnect();
}

run().catch(console.error);

