import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt with a random salt.
 * Returns the hashed value in the format `${hash}.${salt}`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Compare a plain password against a stored scrypt hash.
 */
export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  const [hash, salt] = hashedPassword.split('.');
  if (!hash || !salt) {
    return false;
  }
  const hashedBuf = Buffer.from(hash, 'hex');
  const suppliedBuf = (await scryptAsync(plainPassword, salt, 64)) as Buffer;
  if (hashedBuf.length !== suppliedBuf.length) {
    return false;
  }
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
