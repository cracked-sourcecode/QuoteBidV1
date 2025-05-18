import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { signupState } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const ORDER = ['started', 'payment', 'profile', 'completed'];

export async function updateSignupState(req: Request, res: Response) {
  const userId = req.user?.id as number | undefined;
  const { status } = req.body as { status?: 'payment' | 'profile' | 'completed' };
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!status || !ORDER.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  const db = getDb();
  const [current] = await db.select().from(signupState).where(eq(signupState.userId, userId));
  if (!current) return res.status(400).json({ message: 'Signup not started' });

  const currentIndex = ORDER.indexOf(current.status as string);
  const newIndex = ORDER.indexOf(status);
  if (newIndex < currentIndex) {
    return res.status(400).json({ message: 'Cannot go backwards' });
  }

  await db.update(signupState)
    .set({ status, updatedAt: new Date() })
    .where(eq(signupState.userId, userId));

  return res.json({ status });
}

router.patch('/', updateSignupState);

export default router;
