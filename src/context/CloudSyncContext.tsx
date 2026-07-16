import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useAddictions } from './AddictionContext';
import { useTheme } from './ThemeContext';
import { useAppSettings } from './AppSettingsContext';
import { AppBackup, buildBackupPayload } from '../utils/backup';
import {
  CloudSession,
  CloudSyncError,
  LAST_CLOUD_BACKUP_AT_KEY,
  fetchCloudBackup,
  pushCloudBackup
} from '../services/cloudSync';

const AUTO_PUSH_DEBOUNCE_MS = 2500;

export type CloudSyncStatus = 'idle' | 'syncing' | 'error';

type CloudSyncContextType = {
  status: CloudSyncStatus;
  lastCloudBackupAt: string | null;
  backupNow: () => Promise<void>;
  fetchRemoteBackup: () => Promise<{ backup: AppBackup | null; updatedAt: string | null }>;
  applyCloudBackup: (backup: AppBackup) => void;
  reconcileAfterSignIn: (
    freshSession: CloudSession,
    confirmRestore: (backupCreatedAt: string) => boolean
  ) => Promise<'restored' | 'backedUp'>;
};

const CloudSyncContext = createContext<CloudSyncContextType | undefined>(undefined);

export const CloudSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, logout } = useAuth();
  const { addictions, replaceAddictions } = useAddictions();
  const { theme, setThemeMode } = useTheme();
  const { language, setLanguage } = useAppSettings();

  const [status, setStatus] = useState<CloudSyncStatus>('idle');
  const [lastCloudBackupAt, setLastCloudBackupAt] = useState<string | null>(() =>
    localStorage.getItem(LAST_CLOUD_BACKUP_AT_KEY)
  );

  const recordCloudBackup = useCallback((updatedAt: string) => {
    localStorage.setItem(LAST_CLOUD_BACKUP_AT_KEY, updatedAt);
    setLastCloudBackupAt(updatedAt);
  }, []);

  const pushSnapshot = useCallback(
    async (source: 'auto' | 'manual') => {
      if (!session) {
        throw new CloudSyncError('unauthorized', 'Not signed in.');
      }

      setStatus('syncing');
      try {
        const backup = buildBackupPayload(addictions, theme, source);
        const updatedAt = await pushCloudBackup(session.token, backup);
        recordCloudBackup(updatedAt);
        setStatus('idle');
      } catch (error) {
        if (error instanceof CloudSyncError && error.status === 401) {
          logout();
        }
        setStatus('error');
        throw error;
      }
    },
    [session, addictions, theme, recordCloudBackup, logout]
  );

  const pushSnapshotRef = useRef(pushSnapshot);
  useEffect(() => {
    pushSnapshotRef.current = pushSnapshot;
  }, [pushSnapshot]);

  // Serialized snapshot of everything included in a backup, used to detect real changes.
  const snapshotKey = useMemo(
    () => JSON.stringify({ addictions, theme, language }),
    [addictions, theme, language]
  );
  const lastSyncedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session) {
      lastSyncedKeyRef.current = null;
      return;
    }

    // First run after sign-in (or app start while signed in) only records a
    // baseline, so we never overwrite the cloud copy before the user has had
    // the chance to restore it.
    if (lastSyncedKeyRef.current === null) {
      lastSyncedKeyRef.current = snapshotKey;
      return;
    }

    if (lastSyncedKeyRef.current === snapshotKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastSyncedKeyRef.current = snapshotKey;
      pushSnapshotRef.current('auto').catch((error) => {
        console.error('Automatic cloud backup failed:', error);
      });
    }, AUTO_PUSH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [session, snapshotKey]);

  const backupNow = useCallback(async () => {
    lastSyncedKeyRef.current = snapshotKey;
    await pushSnapshot('manual');
  }, [pushSnapshot, snapshotKey]);

  const fetchRemoteBackup = useCallback(async () => {
    if (!session) {
      throw new CloudSyncError('unauthorized', 'Not signed in.');
    }

    try {
      return await fetchCloudBackup(session.token);
    } catch (error) {
      if (error instanceof CloudSyncError && error.status === 401) {
        logout();
      }
      throw error;
    }
  }, [session, logout]);

  const applyCloudBackup = useCallback(
    (backup: AppBackup) => {
      replaceAddictions(backup.data.addictions);
      setThemeMode(backup.data.settings.theme);
      setLanguage(backup.data.settings.language === 'it' ? 'it' : 'en');
    },
    [replaceAddictions, setThemeMode, setLanguage]
  );

  // Runs right after login/register with the fresh session, because the
  // session state above has not propagated yet inside the same event handler.
  const reconcileAfterSignIn = useCallback(
    async (
      freshSession: CloudSession,
      confirmRestore: (backupCreatedAt: string) => boolean
    ): Promise<'restored' | 'backedUp'> => {
      const { backup } = await fetchCloudBackup(freshSession.token);

      if (backup && (addictions.length === 0 || confirmRestore(backup.createdAt))) {
        applyCloudBackup(backup);
        return 'restored';
      }

      const payload = buildBackupPayload(addictions, theme, 'manual');
      const updatedAt = await pushCloudBackup(freshSession.token, payload);
      recordCloudBackup(updatedAt);
      return 'backedUp';
    },
    [addictions, theme, applyCloudBackup, recordCloudBackup]
  );

  const value = useMemo(
    () => ({ status, lastCloudBackupAt, backupNow, fetchRemoteBackup, applyCloudBackup, reconcileAfterSignIn }),
    [status, lastCloudBackupAt, backupNow, fetchRemoteBackup, applyCloudBackup, reconcileAfterSignIn]
  );

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
};

export const useCloudSync = (): CloudSyncContextType => {
  const context = useContext(CloudSyncContext);
  if (!context) {
    throw new Error('useCloudSync must be used within CloudSyncProvider');
  }
  return context;
};
