import { Addiction, ThemeMode } from '../types';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

export const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const LAST_BACKUP_AT_KEY = 'lastBackupAt';
export const LAST_BACKUP_FILENAME_KEY = 'lastBackupFilename';
export const LAST_BACKUP_SNAPSHOT_KEY = 'lastBackupSnapshot';
export const APP_LANGUAGE_KEY = 'appLanguage';

type BackupVersion = '1.0.0';

export interface AppBackup {
  version: BackupVersion;
  createdAt: string;
  source: 'auto' | 'manual';
  data: {
    addictions: Addiction[];
    settings: {
      theme: ThemeMode;
      language: string;
    };
  };
}

const pad = (value: number): string => String(value).padStart(2, '0');

const isThemeMode = (value: unknown): value is ThemeMode => {
  return value === 'light' || value === 'dark';
};

export const getBackupFilename = (createdAt: Date): string => {
  const yyyy = createdAt.getFullYear();
  const mm = pad(createdAt.getMonth() + 1);
  const dd = pad(createdAt.getDate());
  const hh = pad(createdAt.getHours());
  const min = pad(createdAt.getMinutes());
  const sec = pad(createdAt.getSeconds());

  return `addiction_tracker_backup_${yyyy}-${mm}-${dd}_${hh}-${min}-${sec}.json`;
};

export const buildBackupPayload = (
  addictions: Addiction[],
  theme: ThemeMode,
  source: 'auto' | 'manual'
): AppBackup => {
  return {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    source,
    data: {
      addictions,
      settings: {
        theme,
        language: localStorage.getItem(APP_LANGUAGE_KEY) || 'en'
      }
    }
  };
};

export const persistBackupMetadata = (backup: AppBackup, filename: string): void => {
  localStorage.setItem(LAST_BACKUP_AT_KEY, backup.createdAt);
  localStorage.setItem(LAST_BACKUP_FILENAME_KEY, filename);
  localStorage.setItem(LAST_BACKUP_SNAPSHOT_KEY, JSON.stringify(backup));
};

export const downloadBackupFile = (backup: AppBackup, filename: string): void => {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const saveBackupToNativeFilesystem = async (backup: AppBackup, filename: string): Promise<void> => {
  await Filesystem.writeFile({
    path: filename,
    data: JSON.stringify(backup, null, 2),
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true
  });
};

export const createBackup = async (
  addictions: Addiction[],
  theme: ThemeMode,
  source: 'auto' | 'manual'
): Promise<{ backup: AppBackup; filename: string }> => {
  const backup = buildBackupPayload(addictions, theme, source);
  const filename = getBackupFilename(new Date(backup.createdAt));
  persistBackupMetadata(backup, filename);

  if (Capacitor.isNativePlatform()) {
    await saveBackupToNativeFilesystem(backup, filename);
  } else {
    downloadBackupFile(backup, filename);
  }

  return { backup, filename };
};

export const createAutomaticBackupIfDue = async (
  addictions: Addiction[],
  theme: ThemeMode
): Promise<{ created: boolean; filename?: string }> => {
  const lastBackupAt = localStorage.getItem(LAST_BACKUP_AT_KEY);

  if (lastBackupAt) {
    const elapsed = Date.now() - new Date(lastBackupAt).getTime();
    if (!Number.isNaN(elapsed) && elapsed < BACKUP_INTERVAL_MS) {
      return { created: false };
    }
  }

  const { filename } = await createBackup(addictions, theme, 'auto');
  return { created: true, filename };
};

const assertBackup = (value: unknown): AppBackup => {
  if (!value || typeof value !== 'object') {
    throw new Error('Backup file is invalid.');
  }

  const backup = value as Partial<AppBackup>;

  if (!backup.version || !backup.createdAt || !backup.data || !backup.data.settings) {
    throw new Error('Backup file is missing required fields.');
  }

  if (!Array.isArray(backup.data.addictions)) {
    throw new Error('Backup file has invalid addictions data.');
  }

  if (!isThemeMode(backup.data.settings.theme)) {
    throw new Error('Backup file has invalid theme settings.');
  }

  if (typeof backup.data.settings.language !== 'string') {
    throw new Error('Backup file has invalid language settings.');
  }

  return backup as AppBackup;
};

export const parseBackupFile = async (file: File): Promise<AppBackup> => {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  return assertBackup(parsed);
};

export const getLastBackupInfo = (): { createdAt: string | null; filename: string | null } => {
  return {
    createdAt: localStorage.getItem(LAST_BACKUP_AT_KEY),
    filename: localStorage.getItem(LAST_BACKUP_FILENAME_KEY)
  };
};
