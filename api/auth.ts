import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getSql } from './_lib/db.js';
import { hashPassword, signToken, verifyPassword } from './_lib/auth.js';
import { applyCors, sendError } from './_lib/http.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface AuthRequestBody {
  action?: unknown;
  email?: unknown;
  password?: unknown;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    sendError(res, 405, 'methodNotAllowed', 'Only POST is supported.');
    return;
  }

  const body = (req.body ?? {}) as AuthRequestBody;
  const action = body.action;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (action !== 'login' && action !== 'register') {
    sendError(res, 400, 'invalidAction', 'Action must be "login" or "register".');
    return;
  }

  if (!EMAIL_PATTERN.test(email)) {
    sendError(res, 400, 'invalidEmail', 'A valid email address is required.');
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    sendError(res, 400, 'weakPassword', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    return;
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (action === 'register') {
      const passwordHash = await hashPassword(password);
      const rows = (await sql`
        INSERT INTO app_users (email, password_hash)
        VALUES (${email}, ${passwordHash})
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `) as { id: string }[];

      if (rows.length === 0) {
        sendError(res, 409, 'emailTaken', 'An account with this email already exists.');
        return;
      }

      res.status(200).json({ token: signToken(rows[0].id, email), email });
      return;
    }

    const rows = (await sql`
      SELECT id, password_hash FROM app_users WHERE email = ${email}
    `) as { id: string; password_hash: string }[];

    if (rows.length === 0 || !(await verifyPassword(password, rows[0].password_hash))) {
      sendError(res, 401, 'invalidCredentials', 'Email or password is incorrect.');
      return;
    }

    res.status(200).json({ token: signToken(rows[0].id, email), email });
  } catch (error) {
    console.error('Auth request failed:', error);
    sendError(res, 500, 'serverError', 'Something went wrong. Please try again.');
  }
}
