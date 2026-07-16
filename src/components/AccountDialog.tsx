import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Cloud, UploadCloud, DownloadCloud, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCloudSync } from '../context/CloudSyncContext';
import { CloudSyncError } from '../services/cloudSync';
import { useI18n } from '../i18n/useI18n';

interface AccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountDialog: React.FC<AccountDialogProps> = ({ isOpen, onClose }) => {
  const { session, login, register, logout } = useAuth();
  const {
    status: cloudStatus,
    lastCloudBackupAt,
    backupNow,
    fetchRemoteBackup,
    applyCloudBackup,
    reconcileAfterSignIn
  } = useCloudSync();
  const { t } = useI18n();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
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
    setIsCloudBusy(true);
    try {
      const freshSession = mode === 'signin'
        ? await login(email, authPassword)
        : await register(email, authPassword);

      await reconcileAfterSignIn(freshSession, (backupCreatedAt) =>
        window.confirm(`${t('cloudRestorePrompt')}\n(${new Date(backupCreatedAt).toLocaleString()})`)
      );

      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      console.error('Cloud sign-in failed:', error);
      setFormError(cloudErrorMessage(error));
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleCloudBackupNow = async () => {
    setIsCloudBusy(true);
    try {
      await backupNow();
      alert(t('cloudBackupSuccess'));
    } catch (error) {
      console.error('Cloud backup failed:', error);
      alert(cloudErrorMessage(error));
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleCloudRestore = async () => {
    setIsCloudBusy(true);
    try {
      const { backup } = await fetchRemoteBackup();
      if (!backup) {
        alert(t('noCloudBackupYet'));
        return;
      }

      const confirmed = window.confirm(
        `${t('cloudRestorePrompt')}\n(${new Date(backup.createdAt).toLocaleString()})`
      );
      if (!confirmed) {
        return;
      }

      applyCloudBackup(backup);
      alert(t('cloudRestoreSuccess'));
    } catch (error) {
      console.error('Cloud restore failed:', error);
      alert(cloudErrorMessage(error));
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleSignOut = () => {
    if (window.confirm(t('signOutConfirm'))) {
      logout();
    }
  };

  const cloudStatusText =
    cloudStatus === 'syncing'
      ? t('cloudSyncing')
      : cloudStatus === 'error'
        ? t('cloudSyncError')
        : lastCloudBackupAt
          ? new Date(lastCloudBackupAt).toLocaleString()
          : t('noCloudBackupYet');

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-all duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('cloudAccount')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {session ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg font-semibold uppercase shrink-0">
                {session.email.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('signedInAs')}</div>
                <div className="font-medium text-gray-900 dark:text-white break-all">{session.email}</div>
              </div>
            </div>

            <div className="p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/40 rounded-lg">
              <div className="flex items-start gap-3">
                <Cloud className="w-4 h-4 mt-0.5 text-sky-700 dark:text-sky-300" />
                <div className="text-sm text-sky-900 dark:text-sky-100">
                  <p>{t('cloudAutoBackupDesc')}</p>
                  <p className="mt-1">
                    <span className="font-medium">{t('lastCloudBackup')}:</span> {cloudStatusText}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleCloudBackupNow}
                disabled={isCloudBusy}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{t('cloudBackupNow')}</div>
                </div>
              </button>

              <button
                onClick={handleCloudRestore}
                disabled={isCloudBusy}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                  <DownloadCloud className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{t('cloudRestore')}</div>
                </div>
              </button>

              <button
                onClick={handleSignOut}
                disabled={isCloudBusy}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('signOut')}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center text-center gap-3 pb-2">
              <div className="w-14 h-14 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                <Cloud className="w-7 h-7 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
            />

            <input
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder={t('accountPassword')}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
            />

            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isCloudBusy}
              className="w-full p-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
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
