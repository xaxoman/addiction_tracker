import { AppBackup } from '../utils/backup';

export interface CloudSession {
  token: string;
  email: string;
}

export const CLOUD_SESSION_KEY = 'cloudSession';
export const LAST_CLOUD_BACKUP_AT_KEY = 'lastCloudBackupAt';

// On the hosted PWA the API lives on the same origin, so relative /api works.
// Native (Capacitor) builds must set VITE_API_BASE_URL to the deployed URL.
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/+$/, '');

export class CloudSyncError extends Error {
  status: number | null;
  code: string;

  constructor(code: string, message: string, status: number | null = null) {
    super(message);
    this.name = 'CloudSyncError';
    this.code = code;
    this.status = status;
  }
}

const request = async (path: string, init: RequestInit): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {})
      }
    });
  } catch {
    throw new CloudSyncError('networkError', 'Could not reach the server.');
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response body; fall through to the status check.
  }

  if (!response.ok) {
    const errorInfo = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new CloudSyncError(
      errorInfo?.code ?? 'serverError',
      errorInfo?.message ?? 'Request failed.',
      response.status
    );
  }

  return data;
};

const authenticate = async (
  action: 'login' | 'register',
  email: string,
  password: string
): Promise<CloudSession> => {
  const data = (await request('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ action, email, password })
  })) as { token?: string; email?: string };

  if (!data.token || !data.email) {
    throw new CloudSyncError('serverError', 'Unexpected server response.');
  }

  return { token: data.token, email: data.email };
};

export const loginToCloud = (email: string, password: string): Promise<CloudSession> =>
  authenticate('login', email, password);

export const registerCloudAccount = (email: string, password: string): Promise<CloudSession> =>
  authenticate('register', email, password);

export const fetchCloudBackup = async (
  token: string
): Promise<{ backup: AppBackup | null; updatedAt: string | null }> => {
  const data = (await request('/api/backup', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })) as { backup?: AppBackup | null; updatedAt?: string | null };

  return { backup: data.backup ?? null, updatedAt: data.updatedAt ?? null };
};

export const pushCloudBackup = async (token: string, backup: AppBackup): Promise<string> => {
  const data = (await request('/api/backup', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ backup })
  })) as { updatedAt?: string };

  return data.updatedAt ?? new Date().toISOString();
};

export const readStoredSession = (): CloudSession | null => {
  const raw = localStorage.getItem(CLOUD_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CloudSession>;
    if (typeof parsed.token === 'string' && typeof parsed.email === 'string') {
      return { token: parsed.token, email: parsed.email };
    }
  } catch {
    // Corrupted session data; treat as signed out.
  }

  localStorage.removeItem(CLOUD_SESSION_KEY);
  return null;
};

export const persistSession = (session: CloudSession | null): void => {
  if (session) {
    localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(CLOUD_SESSION_KEY);
  }
};
