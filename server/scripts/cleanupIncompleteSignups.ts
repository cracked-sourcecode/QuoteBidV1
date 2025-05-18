import { initializeDatabase, getDb } from '../db';
import { signupState, users } from '@shared/schema';
import { lt, ne, eq, and } from 'drizzle-orm';

export async function cleanupIncompleteSignups(): Promise<void> {
  initializeDatabase();
  const db = getDb();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const stale = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(signupState, eq(users.id, signupState.userId))
    .where(and(ne(signupState.status, 'completed'), lt(users.createdAt, cutoff)));

  for (const row of stale) {
    await db.transaction(async (tx) => {
      await tx.delete(signupState).where(eq(signupState.userId, row.id));
      await tx.delete(users).where(eq(users.id, row.id));
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupIncompleteSignups().then(() => {
    console.log('cleanup finished');
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
