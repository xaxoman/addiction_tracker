import type { VercelRequest, VercelResponse } from '@vercel/node';

export const applyCors = (req: VercelRequest, res: VercelResponse): boolean => {
  // Token-based auth (no cookies), so a wildcard origin is safe. Needed because
  // the Capacitor app calls the API from a capacitor://localhost origin.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
};

export const sendError = (res: VercelResponse, status: number, code: string, message: string): void => {
  res.status(status).json({ error: { code, message } });
};
