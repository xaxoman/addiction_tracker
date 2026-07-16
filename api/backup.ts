import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getSql } from './_lib/db.js';
import { getBearerToken, verifyToken } from './_lib/auth.js';
import { applyCors, sendError } from './_lib/http.js';

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB is far beyond any realistic backup

interface BackupRequestBody {
  backup?: unknown;
}

const isValidBackupPayload = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const backup = value as { version?: unknown; createdAt?: unknown; data?: { addictions?: unknown } };
  return (
    typeof backup.version === 'string' &&
    typeof backup.createdAt === 'string' &&
    !!backup.data &&
    Array.isArray(backup.data.addictions)
  );
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (applyCors(req, res)) {
    return;
  }

  const token = getBearerToken(req.headers.authorization);
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    sendError(res, 401, 'unauthorized', 'A valid session token is required.');
    return;
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (req.method === 'GET') {
      const rows = (await sql`
        SELECT payload, updated_at FROM user_backups WHERE user_id = ${payload.sub}
      `) as { payload: unknown; updated_at: string }[];

      if (rows.length === 0) {
        res.status(200).json({ backup: null, updatedAt: null });
        return;
      }

      res.status(200).json({ backup: rows[0].payload, updatedAt: rows[0].updated_at });
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = (req.body ?? {}) as BackupRequestBody;
      const backup = body.backup;

      if (!isValidBackupPayload(backup)) {
        sendError(res, 400, 'invalidBackup', 'The backup payload is malformed.');
        return;
      }

      const serialized = JSON.stringify(backup);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) {
        sendError(res, 413, 'backupTooLarge', 'The backup payload is too large.');
        return;
      }

      const clientCreatedAt = (backup as { createdAt: string }).createdAt;
      const rows = (await sql`
        INSERT INTO user_backups (user_id, payload, client_created_at, updated_at)
        VALUES (${payload.sub}, ${serialized}::jsonb, ${clientCreatedAt}, now())
        ON CONFLICT (user_id) DO UPDATE
          SET payload = EXCLUDED.payload,
              client_created_at = EXCLUDED.client_created_at,
              updated_at = now()
        RETURNING updated_at
      `) as { updated_at: string }[];

      res.status(200).json({ updatedAt: rows[0].updated_at });
      return;
    }

    sendError(res, 405, 'methodNotAllowed', 'Only GET, POST and PUT are supported.');
  } catch (error) {
    console.error('Backup request failed:', error);
    sendError(res, 500, 'serverError', 'Something went wrong. Please try again.');
  }
}
