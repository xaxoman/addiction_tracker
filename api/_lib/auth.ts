import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_KEYLEN = 64;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const scryptAsync = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt);
  return `scrypt:${salt}:${derived.toString('hex')}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) {
    return false;
  }
  const derived = await scryptAsync(password, salt);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derived.length && timingSafeEqual(derived, expected);
};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return secret;
};

const b64url = (value: Buffer | string): string =>
  Buffer.from(value).toString('base64url');

const hmac = (input: string, secret: string): string =>
  createHmac('sha256', secret).update(input).digest('base64url');

export interface TokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export const signToken = (userId: string, email: string): string => {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ sub: userId, email, iat: now, exp: now + TOKEN_TTL_SECONDS } satisfies TokenPayload)
  );
  const signature = hmac(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
};

export const verifyToken = (token: string): TokenPayload | null => {
  const secret = getJwtSecret();
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const expected = hmac(`${header}.${payload}`, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenPayload;
    if (typeof decoded.sub !== 'string' || typeof decoded.exp !== 'number') {
      return null;
    }
    if (decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

export const getBearerToken = (authorizationHeader: string | string[] | undefined): string | null => {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};
