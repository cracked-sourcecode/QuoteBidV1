import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const SECRET = process.env.JWT_SECRET || 'quotebid_secret';
const EXP = '7d'; // 7 days for development

export interface JWTPayload {
  sub: number;
  id: number;
  email: string;
  role: string;
  iat: number;
  jti: string;
  exp?: number;
}

export function signUser(user: { id: number; email: string; role?: string }) {
  const jti = randomUUID(); // Unique token ID
  const iat = Math.floor(Date.now() / 1000); // Issued at timestamp
  
  const payload = {
    sub: user.id,          // "subject" – who the token is about
    id: user.id,           // Keep for backward compatibility
    email: user.email,     // convenience claim
    role: user.role || 'user',
    iat,                   // issued-at is always unique
    jti,                   // **token id** – 100% unique per call
  };
  
  console.info('[JWT] Minted JWT jti=%s for uid=%s email=%s', jti, user.id, user.email);
  
  return jwt.sign(payload, SECRET, { expiresIn: EXP });
}

export function verifyToken(token: string): JWTPayload {
  const decoded = jwt.verify(token, SECRET);
  
  // Type guard to ensure we have the expected shape
  if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
    return decoded as unknown as JWTPayload;
  }
  
  throw new Error('Invalid token payload');
} 