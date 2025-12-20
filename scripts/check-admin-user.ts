import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import { UserModel } from '../models';

async function checkAdminUser() {
  await connectDB();
  
  const user = await UserModel.findOne({ email: 'adekunle@gmail.com' });
  
  if (user) {
    console.log('User found:');
    console.log('  Email:', user.email);
    console.log('  Username:', user.username || 'NOT SET');
    console.log('  isAdmin:', user.isAdmin);
    console.log('  Role:', user.role);
    console.log('  Has password:', !!user.password);
    console.log('  mustChangePassword:', user.mustChangePassword);
  } else {
    console.log('User not found');
  }
  
  process.exit(0);
}

checkAdminUser();
