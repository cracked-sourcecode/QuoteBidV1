import { sql } from 'drizzle-orm';

export async function up(db: any): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS signup_state (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'started',
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.execute(sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS has_signed_agreement BOOLEAN DEFAULT false;
  `);
}

export async function down(db: any): Promise<void> {
  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS has_signed_agreement;`);
  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS is_paid;`);
  await db.execute(sql`DROP TABLE IF EXISTS signup_state;`);
}

export default { up, down };
