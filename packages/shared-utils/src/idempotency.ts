import { createHash } from 'crypto';

export function generateIdempotencyKey(userId: string): string {
  const ts = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 10);
  return createHash('sha256')
    .update(`${userId}:${ts}:${random}`)
    .digest('hex')
    .substring(0, 32);
}

export function isValidIdempotencyKey(key: string): boolean {
  return /^[a-f0-9]{32}$/.test(key);
}
