import 'tsconfig-paths/register';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from './db-setup';

async function main(): Promise<void> {
  await setupTestDatabase();
  await cleanupTestDatabase();
  await closeTestDatabase();
  console.log('🧹 Test database cleaned');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to clean test database', error);
    process.exit(1);
  });
