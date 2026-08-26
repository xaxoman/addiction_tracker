import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './AuthContext';
import { useAddictions } from './AddictionContext';
import { useCheckIns } from './CheckInContext';
import { useTheme } from './ThemeContext';
import { useAppSettings } from './AppSettingsContext';
import { Addiction, DailyCheckIn, ThemeMode } from '../types';
import { AppBackup, buildBackupPayload } from '../utils/backup';
import {
  CloudSession,
  CloudSyncError,
  LAST_CLOUD_BACKUP_AT_KEY,
  fetchCloudBackup,
  pushCloudBackup
} from '../services/cloudSync';

// Edits settle for this long before they are pushed, so a burst of changes
// (typing a name, dragging cards) turns into a single upload.
const AUTO_PUSH_DEBOUNCE_MS = 1500;
// The cloud copy is re-read whenever the app comes back to the foreground, but
// at most this often so that tab switching does not hammer the API.
const PULL_THROTTLE_MS = 15 * 1000;
// ...and on this interval while the app stays open, to pick up edits made on
// another device.
const POLL_INTERVAL_MS = 5 * 60 * 1000;

export type CloudSyncStatus = 'disabled' | 'syncing' | 'pending' | 'synced' | 'offline' | 'error';

type LocalSnapshot = {
  key: string;
  addictions: Addiction[];
  checkIns: DailyCheckIn[];
  theme: ThemeMode;
};

type CloudSyncContextType = {
  status: CloudSyncStatus;
  lastSyncedAt: string | null;
  /** Pushes unsaved changes right away, e.g. before signing out. */
  flushPendingChanges: () => Promise<void>;
  reconcileAfterSignIn: (
    freshSession: CloudSession,
    confirmRestore: (backupCreatedAt: string) => boolean
  ) => Promise<'restored' | 'backedUp' | 'inSync'>;
};

const CloudSyncContext = createContext<CloudSyncContextType | undefined>(undefined);

const isOnline = (): boolean => typeof navigator === 'undefined' || navigator.onLine !== false;

// Serialized view of everything a backup contains, used to tell whether the
// local and cloud copies actually differ.
const localSnapshotKey = (
  addictions: Addiction[],
  checkIns: DailyCheckIn[],
  theme: ThemeMode,
  language: string
): string => JSON.stringify({ addictions, checkIns, theme, language });

const remoteSnapshotKey = (backup: AppBackup): string =>
  JSON.stringify({
    addictions: backup.data.addictions,
    // Older backups have no series at all; comparing against [] keeps them
    // equal to a device that has never checked in, instead of looking changed
    // on every poll.
    checkIns: backup.data.checkIns ?? [],
    theme: backup.data.settings.theme,
    language: backup.data.settings.language
  });

// Both timestamps are issued by the server, so this comparison is immune to
// device clock skew. A cloud copy that moved on since this device last synced
// can only come from another device, and it wins; anything else means the
// difference is this device's own unsent edits, which are pushed instead.
const remoteChangedSinceLastSync = (remoteUpdatedAt: string): boolean => {
  const remoteTime = Date.parse(remoteUpdatedAt);
  if (Number.isNaN(remoteTime)) {
    return false;
  }

  const storedSync = localStorage.getItem(LAST_CLOUD_BACKUP_AT_KEY);
  const lastSyncTime = storedSync ? Date.parse(storedSync) : 0;
  return Number.isNaN(lastSyncTime) || remoteTime > lastSyncTime;
};

export const CloudSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, logout } = useAuth();
  const { addictions, replaceAddictions } = useAddictions();
  const { checkIns, replaceCheckIns } = useCheckIns();
  const { theme, setThemeMode } = useTheme();
  const { language, setLanguage } = useAppSettings();

  const [status, setStatus] = useState<CloudSyncStatus>(() => (session ? 'syncing' : 'disabled'));
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    localStorage.getItem(LAST_CLOUD_BACKUP_AT_KEY)
  );
  // Flipped once the cloud copy has been read for the current session. Local
  // edits are only pushed after that, so a pending restore is never overwritten.
  const [isPrimed, setIsPrimed] = useState(false);

  const snapshotKey = useMemo(
    () => localSnapshotKey(addictions, checkIns, theme, language),
    [addictions, checkIns, theme, language]
  );

  // Latest values, readable from listeners and async callbacks that must not be
  // re-created (and re-registered) on every edit.
  const sessionRef = useRef<CloudSession | null>(session);
  const snapshotRef = useRef<LocalSnapshot>({ key: snapshotKey, addictions, checkIns, theme });
  const logoutRef = useRef(logout);
  const applyBackupRef = useRef<(backup: AppBackup) => void>(() => {});

  useEffect(() => {
    sessionRef.current = session;
    snapshotRef.current = { key: snapshotKey, addictions, checkIns, theme };
    logoutRef.current = logout;
    applyBackupRef.current = (backup: AppBackup) => {
      replaceAddictions(backup.data.addictions);
      replaceCheckIns(backup.data.checkIns ?? []);
      setThemeMode(backup.data.settings.theme);
      setLanguage(backup.data.settings.language === 'it' ? 'it' : 'en');
    };
  });

  // Content already stored in the cloud; anything else means unsynced changes.
  const syncedKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const queuedPullRef = useRef<boolean | null>(null);
  const lastPullAtRef = useRef(0);

  const recordSync = useCallback((updatedAt: string) => {
    localStorage.setItem(LAST_CLOUD_BACKUP_AT_KEY, updatedAt);
    setLastSyncedAt(updatedAt);
  }, []);

  const pushSnapshot = useCallback(
    async (token: string, options: { keepalive?: boolean } = {}) => {
      const snapshot = snapshotRef.current;
      const updatedAt = await pushCloudBackup(
        token,
        buildBackupPayload(snapshot.addictions, snapshot.theme, 'auto', snapshot.checkIns),
        options
      );
      syncedKeyRef.current = snapshot.key;
      recordSync(updatedAt);
    },
    [recordSync]
  );

  const syncRef = useRef<(options: { pull: boolean }) => Promise<void>>(async () => {});

  const sync = useCallback(
    async ({ pull }: { pull: boolean }): Promise<void> => {
      const activeSession = sessionRef.current;
      if (!activeSession) {
        return;
      }

      if (inFlightRef.current) {
        queuedPullRef.current = (queuedPullRef.current ?? false) || pull;
        return;
      }

      if (!isOnline()) {
        setStatus('offline');
        setIsPrimed(true);
        return;
      }

      inFlightRef.current = true;
      setStatus('syncing');

      try {
        if (pull) {
          lastPullAtRef.current = Date.now();
          const { backup, updatedAt } = await fetchCloudBackup(activeSession.token);

          if (backup) {
            const remoteKey = remoteSnapshotKey(backup);
            const remoteUpdatedAt = updatedAt ?? backup.createdAt;

            if (remoteKey === snapshotRef.current.key) {
              syncedKeyRef.current = remoteKey;
              recordSync(remoteUpdatedAt);
              setStatus('synced');
              return;
            }

            if (remoteChangedSinceLastSync(remoteUpdatedAt)) {
              // Another device holds fresher data: adopt it instead of pushing.
              // The state update lands after this call, so anything queued would
              // still be carrying the stale copy; drop it and let the change
              // effect re-schedule from the restored data.
              queuedPullRef.current = null;
              syncedKeyRef.current = remoteKey;
              recordSync(remoteUpdatedAt);
              applyBackupRef.current(backup);
              setStatus('synced');
              return;
            }
          }
        }

        if (syncedKeyRef.current !== snapshotRef.current.key) {
          await pushSnapshot(activeSession.token);
        }
        setStatus('synced');
      } catch (error) {
        if (error instanceof CloudSyncError && error.status === 401) {
          logoutRef.current();
          return;
        }
        if (error instanceof CloudSyncError && error.code === 'networkError') {
          setStatus('offline');
          return;
        }
        console.error('Cloud sync failed:', error);
        setStatus('error');
      } finally {
        inFlightRef.current = false;
        setIsPrimed(true);

        const queued = queuedPullRef.current;
        queuedPullRef.current = null;
        if (queued !== null) {
          window.setTimeout(() => {
            void syncRef.current({ pull: queued });
          }, 0);
        }
      }
    },
    [pushSnapshot, recordSync]
  );

  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  // Best-effort push for the moment the app is being backgrounded or closed:
  // the request cannot be awaited, so the synced marker is rolled back if it
  // turns out to have failed.
  const flushOnHide = useCallback(() => {
    const activeSession = sessionRef.current;
    const snapshot = snapshotRef.current;
    if (!activeSession || inFlightRef.current || !isOnline()) {
      return;
    }
    if (syncedKeyRef.current === snapshot.key) {
      return;
    }

    syncedKeyRef.current = snapshot.key;
    pushCloudBackup(
      activeSession.token,
      buildBackupPayload(snapshot.addictions, snapshot.theme, 'auto', snapshot.checkIns),
      { keepalive: true }
    )
      .then((updatedAt) => recordSync(updatedAt))
      .catch(() => {
        syncedKeyRef.current = null;
      });
  }, [recordSync]);

  // Read the cloud copy once per session, before any local edit is pushed.
  useEffect(() => {
    if (!session) {
      syncedKeyRef.current = null;
      lastPullAtRef.current = 0;
      setIsPrimed(false);
      setStatus('disabled');
      return;
    }

    // Signing in already reconciled with the cloud; don't fetch twice.
    if (Date.now() - lastPullAtRef.current < PULL_THROTTLE_MS) {
      setStatus(syncedKeyRef.current === snapshotRef.current.key ? 'synced' : 'pending');
      setIsPrimed(true);
      return;
    }

    setIsPrimed(false);
    void syncRef.current({ pull: true });
  }, [session]);

  // Push local changes automatically as they happen.
  useEffect(() => {
    if (!session || !isPrimed) {
      return;
    }

    if (syncedKeyRef.current === snapshotKey) {
      // Nothing outstanding: this fires after a restore settles, once the
      // sanitized local copy has caught up with what was pulled.
      setStatus((current) => (current === 'pending' ? 'synced' : current));
      return;
    }

    setStatus((current) => (current === 'syncing' ? current : 'pending'));

    const timeoutId = window.setTimeout(() => {
      void syncRef.current({ pull: false });
    }, AUTO_PUSH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [session, isPrimed, snapshotKey]);

  // Pull again whenever the app regains focus, comes back online, or has been
  // sitting open for a while, so other devices' edits arrive on their own.
  useEffect(() => {
    if (!session) {
      return;
    }

    const pullIfStale = (force = false) => {
      if (!force && Date.now() - lastPullAtRef.current < PULL_THROTTLE_MS) {
        return;
      }
      void syncRef.current({ pull: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pullIfStale();
      } else {
        flushOnHide();
      }
    };
    const handleFocus = () => pullIfStale();
    const handleOnline = () => pullIfStale(true);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('pagehide', flushOnHide);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        pullIfStale(true);
      }
    }, POLL_INTERVAL_MS);

    let removeAppStateListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      const listenerHandle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          pullIfStale();
        } else {
          flushOnHide();
        }
      });
      removeAppStateListener = () => {
        void listenerHandle.then((listener) => listener.remove());
      };
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pagehide', flushOnHide);
      window.clearInterval(intervalId);
      removeAppStateListener?.();
    };
  }, [session, flushOnHide]);

  const flushPendingChanges = useCallback(async () => {
    if (!sessionRef.current || syncedKeyRef.current === snapshotRef.current.key) {
      return;
    }
    await syncRef.current({ pull: false });
  }, []);

  // Runs right after login/register with the fresh session, because the session
  // state above has not propagated yet inside the same event handler. This is
  // the only moment a choice is needed: afterwards the newest copy always wins.
  const reconcileAfterSignIn = useCallback(
    async (
      freshSession: CloudSession,
      confirmRestore: (backupCreatedAt: string) => boolean
    ): Promise<'restored' | 'backedUp' | 'inSync'> => {
      lastPullAtRef.current = Date.now();
      const { backup, updatedAt } = await fetchCloudBackup(freshSession.token);
      const snapshot = snapshotRef.current;

      if (backup) {
        const remoteKey = remoteSnapshotKey(backup);
        const remoteUpdatedAt = updatedAt ?? backup.createdAt;

        if (remoteKey === snapshot.key) {
          syncedKeyRef.current = remoteKey;
          recordSync(remoteUpdatedAt);
          return 'inSync';
        }

        if (snapshot.addictions.length === 0 || confirmRestore(backup.createdAt)) {
          syncedKeyRef.current = remoteKey;
          recordSync(remoteUpdatedAt);
          applyBackupRef.current(backup);
          return 'restored';
        }
      }

      await pushSnapshot(freshSession.token);
      return 'backedUp';
    },
    [pushSnapshot, recordSync]
  );

  const value = useMemo(
    () => ({ status, lastSyncedAt, flushPendingChanges, reconcileAfterSignIn }),
    [status, lastSyncedAt, flushPendingChanges, reconcileAfterSignIn]
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
