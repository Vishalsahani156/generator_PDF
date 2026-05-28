import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { User } from './models/User';

const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'password123';

async function seed() {
  await connectDB();

  const existing = await User.findOne({ email: DEFAULT_EMAIL });
  if (existing) {
    console.log(`[seed] user ${DEFAULT_EMAIL} already exists, skipping`);
  } else {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await User.create({
      email: DEFAULT_EMAIL,
      passwordHash,
      name: 'Admin',
    });
    console.log(`[seed] created user ${DEFAULT_EMAIL} / ${DEFAULT_PASSWORD}`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
