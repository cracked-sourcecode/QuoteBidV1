import { writeFileSync } from 'fs';

const envContent = 'DATABASE_URL=postgresql://neondb_owner:npg_7IqSJmvyUZ2d@ep-black-truth-a5i2qahj.us-east-2.aws.neon.tech/neondb?sslmode=require\n';

try {
  writeFileSync('.env', envContent);
  console.log('Successfully wrote .env file');
} catch (error) {
  console.error('Error writing .env file:', error);
} 