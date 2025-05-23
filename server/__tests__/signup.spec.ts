import { startSignup } from '../routes/signupStage';
import { updateSignupState } from '../routes/signupState';
import { cleanupIncompleteSignups } from '../scripts/cleanupIncompleteSignups';

jest.mock('../db', () => ({
  getDb: jest.fn(),
  initializeDatabase: jest.fn(),
}));
import { getDb } from '../db';

jest.mock('../scripts/cleanupIncompleteSignups', () => ({
  cleanupIncompleteSignups: jest.fn().mockResolvedValue(undefined)
}));

// Improved mock chain for Drizzle ORM
const mockWhere = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockReturnThis();
const mockFrom = jest.fn(() => ({ where: mockWhere, limit: mockLimit }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

const mockDb: any = {
  select: mockSelect,
  insert: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  transaction: jest.fn(),
};
(getDb as jest.Mock).mockReturnValue(mockDb);

describe('signup flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('duplicate email restart logic', async () => {
    mockDb.select
      .mockResolvedValueOnce([{ id: 1 }]) // existing user
      .mockResolvedValueOnce([{ status: 'started' }]); // signup_state
    mockDb.transaction.mockImplementation(async (cb: any) => {
      await cb({
        delete: jest.fn(),
        insert: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValueOnce([{ id: 2 }]) })
      });
    });
    const req: any = { body: { email: 'a@a.com', username: 'a', phone: '1', password: 'p' } };
    const res: any = { status: jest.fn(() => res), json: jest.fn() };
    await startSignup(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ userId: 2, step: 'agreement' });
  });

  test('status cannot regress', async () => {
    mockDb.select.mockResolvedValueOnce([{ status: 'payment' }]);
    const update = jest.fn();
    mockDb.update.mockReturnValue({ set: () => ({ where: update }) });
    const req: any = { user: { id: 1 }, body: { status: 'started' } };
    const res: any = { status: jest.fn(() => res), json: jest.fn() };
    await updateSignupState(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(update).not.toHaveBeenCalled();
  });

  test('cleanup removes stale users', async () => {
    mockDb.select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ id: 1 }]) }) });
    const del = jest.fn();
    mockDb.transaction.mockImplementation(async (cb: any) => {
      await cb({ delete: del });
    });
    await cleanupIncompleteSignups();
    expect(del).toHaveBeenCalled();
  });
});
