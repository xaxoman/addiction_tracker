import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Cloud, CloudOff, CheckCircle2, RefreshCw, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCloudSync, CloudSyncStatus } from '../context/CloudSyncContext';
import { CloudSyncError } from '../services/cloudSync';
import { useI18n } from '../i18n/useI18n';

interface AccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountDialog: React.FC<AccountDialogProps> = ({ isOpen, onClose }) => {
  const { session, login, register, logout } = useAuth();
  const { status: cloudStatus, lastSyncedAt, flushPendingChanges, reconcileAfterSignIn } = useCloudSync();
  const { t } = useI18n();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCloudBusy, setIsCloudBusy] = useState(false);

  if (!isOpen) return null;

  const cloudErrorMessage = (error: unknown): string => {
    if (error instanceof CloudSyncError) {
      switch (error.code) {
        case 'invalidCredentials':
          return t('authFailed');
        case 'emailTaken':
          return t('emailTaken');
        case 'invalidEmail':
          return t('invalidEmail');
        case 'weakPassword':
          return t('passwordTooShort');
        case 'networkError':
          return t('networkError');
      }
    }
    return t('cloudGenericError');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = authEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError(t('invalidEmail'));
      return;
    }
    if (authPassword.length < 8) {
      setFormError(t('passwordTooShort'));
      return;
    }

    setFormError(null);
    setNotice(null);
    setIsCloudBusy(true);
    try {
      const freshSession = mode === 'signin'
        ? await login(email, authPassword)
        : await register(email, authPassword);

      const outcome = await reconcileAfterSignIn(freshSession, (backupCreatedAt) =>
        window.confirm(`${t('cloudRestorePrompt')}\n(${new Date(backupCreatedAt).toLocaleString()})`)
      );
      if (outcome === 'restored') {
        setNotice(t('cloudRestoreSuccess'));
      }

      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      console.error('Cloud sign-in failed:', error);
      setFormError(cloudErrorMessage(error));
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!window.confirm(t('signOutConfirm'))) {
      return;
    }

    setIsCloudBusy(true);
    try {
      // Make sure edits that are still waiting on the debounce reach the cloud.
      await flushPendingChanges();
    } finally {
      setIsCloudBusy(false);
      setNotice(null);
      logout();
    }
  };

  const syncAppearance: Record<
    Exclude<CloudSyncStatus, 'disabled'>,
    { icon: React.ElementType; label: string; iconClass: string; boxClass: string; textClass: string }
  > = {
    syncing: {
      icon: RefreshCw,
      label: t('cloudSyncing'),
      iconClass: 'text-sky-600 dark:text-sky-300 animate-spin',
      boxClass: 'bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-900/40',
      textClass: 'text-sky-900 dark:text-sky-100'
    },
    pending: {
      icon: Cloud,
      label: t('cloudSyncPending'),
      iconClass: 'text-sky-600 dark:text-sky-300',
      boxClass: 'bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-900/40',
      textClass: 'text-sky-900 dark:text-sky-100'
    },
    synced: {
      icon: CheckCircle2,
      label: t('cloudSyncSynced'),
      iconClass: 'text-brand-600 dark:text-brand-400',
      boxClass: 'bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-900/40',
      textClass: 'text-brand-900 dark:text-brand-100'
    },
    offline: {
      icon: CloudOff,
      label: t('cloudSyncOffline'),
      iconClass: 'text-amber-600 dark:text-amber-400',
      boxClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40',
      textClass: 'text-amber-900 dark:text-amber-100'
    },
    error: {
      icon: AlertTriangle,
      label: t('cloudSyncError'),
      iconClass: 'text-red-600 dark:text-red-400',
      boxClass: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/40',
      textClass: 'text-red-900 dark:text-red-100'
    }
  };

  const sync = syncAppearance[cloudStatus === 'disabled' ? 'syncing' : cloudStatus];
  const SyncIcon = sync.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-all duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-sage-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-sage-200 dark:border-sage-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-sage-900 dark:text-white">{t('cloudAccount')}</h2>
          <button
            onClick={onClose}
            className="text-sage-500 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {session ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white text-lg font-semibold uppercase shrink-0">
                {session.email.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-sage-500 dark:text-sage-400">{t('signedInAs')}</div>
                <div className="font-medium text-sage-900 dark:text-white break-all">{session.email}</div>
              </div>
            </div>

            {notice && (
              <p className="text-sm text-brand-700 dark:text-brand-300 text-center">{notice}</p>
            )}

            <div className={`p-4 border rounded-lg ${sync.boxClass}`}>
              <div className="flex items-start gap-3">
                <SyncIcon className={`w-4 h-4 mt-0.5 shrink-0 ${sync.iconClass}`} />
                <div className={`text-sm ${sync.textClass}`} aria-live="polite">
                  <p className="font-medium">{sync.label}</p>
                  <p className="mt-1 opacity-90">{t('cloudAutoSyncDesc')}</p>
                  <p className="mt-1 opacity-90">
                    <span className="font-medium">{t('lastSynced')}:</span>{' '}
                    {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : t('cloudNeverSynced')}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={isCloudBusy}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              <span>{isCloudBusy ? t('pleaseWait') : t('signOut')}</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center text-center gap-3 pb-2">
              <div className="w-14 h-14 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                <Cloud className="w-7 h-7 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="text-sm text-sage-600 dark:text-sage-400">
                {mode === 'signin' ? t('cloudAccountDesc') : t('cloudAccountSignUpDesc')}
              </p>
            </div>

            <input
              type="email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder={t('accountEmail')}
              autoComplete="email"
              required
              className="w-full px-3 py-2.5 border border-sage-200 dark:border-sage-600 rounded-xl bg-white dark:bg-sage-700 text-sage-900 dark:text-white placeholder-sage-400"
            />

            <input
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder={t('accountPassword')}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              className="w-full px-3 py-2.5 border border-sage-200 dark:border-sage-600 rounded-xl bg-white dark:bg-sage-700 text-sage-900 dark:text-white placeholder-sage-400"
            />

            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isCloudBusy}
              className="w-full p-3 rounded-xl bg-brand-700 text-white font-semibold hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCloudBusy ? t('pleaseWait') : mode === 'signin' ? t('signIn') : t('createAccount')}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setFormError(null);
              }}
              disabled={isCloudBusy}
              className="w-full text-sm text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
            >
              {mode === 'signin' ? t('switchToSignUp') : t('switchToSignIn')}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AccountDialog;
