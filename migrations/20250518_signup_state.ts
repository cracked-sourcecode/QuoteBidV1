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
      ADD COLUMN IF NOT EXISTS has_agreed_to_terms BOOLEAN DEFAULT false;
  `);
  await db.execute(sql`
    UPDATE users 
    SET signup_stage = 'payment' 
    WHERE signup_stage = 'agreement';
  `);
}

export async function down(db: any): Promise<void> {
  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS has_agreed_to_terms;`);
  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS is_paid;`);
  await db.execute(sql`DROP TABLE IF EXISTS signup_state;`);
  await db.execute(sql`
    UPDATE users 
    SET signup_stage = 'agreement' 
    WHERE signup_stage = 'payment';
  `);
}

export default { up, down };
