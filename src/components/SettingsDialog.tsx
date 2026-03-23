import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Moon, Sun, Download, FileText, Table, Languages, Upload, Clock, Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAddictions } from '../context/AddictionContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { Addiction } from '../types';
import { exportAddictionsToCSV, exportAddictionsToTSV } from '../utils/exportData';
import {
  createBackup,
  getBackupFilename,
  getLastBackupInfo,
  parseBackupFile,
  persistBackupMetadata
} from '../utils/backup';
import { useI18n } from '../i18n/useI18n';
import { requestNotificationPermission } from '../services/checkInNotifications';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addictions: Addiction[];
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, addictions }) => {
  const { theme, toggleTheme, setThemeMode } = useTheme();
  const { replaceAddictions } = useAddictions();
  const {
    language,
    setLanguage,
    dailyCheckInEnabled,
    setDailyCheckInEnabled,
    dailyCheckInTime,
    setDailyCheckInTime
  } = useAppSettings();
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);
  const [isHandlingBackup, setIsHandlingBackup] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [lastBackupFilename, setLastBackupFilename] = useState<string | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const backupInfo = getLastBackupInfo();
    setLastBackupAt(backupInfo.createdAt);
    setLastBackupFilename(backupInfo.filename);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = async (format: 'csv' | 'tsv') => {
    if (addictions.length === 0) {
      alert(t('noDataToExport'));
      return;
    }

    setIsExporting(true);

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `addiction_tracker_export_${timestamp}.${format}`;

      if (format === 'csv') {
        exportAddictionsToCSV(addictions, filename);
      } else {
        exportAddictionsToTSV(addictions, filename);
      }

      setTimeout(() => {
        alert(t('exportSuccess'));
      }, 100);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsHandlingBackup(true);

    try {
      const { backup, filename } = await createBackup(addictions, theme, 'manual');
      setLastBackupAt(backup.createdAt);
      setLastBackupFilename(filename);
      alert(`${t('backupCreated')} ${filename}`);
    } catch (error) {
      console.error('Backup creation failed:', error);
      alert(t('backupCreateFailed'));
    } finally {
      setIsHandlingBackup(false);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsHandlingBackup(true);

    try {
      const backup = await parseBackupFile(file);
      replaceAddictions(backup.data.addictions);
      setThemeMode(backup.data.settings.theme);
      setLanguage(backup.data.settings.language === 'it' ? 'it' : 'en');

      const filename = file.name || getBackupFilename(new Date(backup.createdAt));
      persistBackupMetadata(backup, filename);
      setLastBackupAt(backup.createdAt);
      setLastBackupFilename(filename);

      alert(t('backupImported'));
    } catch (error) {
      console.error('Backup import failed:', error);
      alert(t('backupImportFailed'));
    } finally {
      event.target.value = '';
      setIsHandlingBackup(false);
    }
  };

  const handleRequestPermission = async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'unsupported') {
      alert(t('notificationNotSupported'));
      return;
    }

    if (permission === 'granted') {
      alert(t('permissionGranted'));
      return;
    }

    alert(t('permissionDenied'));
  };

  const lastBackupText = lastBackupAt ? new Date(lastBackupAt).toLocaleString() : t('noBackupYet');

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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('appearance')}</h3>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  {theme === 'light' ? (
                    <Sun className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">{t('theme')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {theme === 'light' ? t('switchToDark') : t('switchToLight')}
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('language')}</h3>
            <div className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <Languages className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">{t('appLanguage')}</div>
                </div>
              </div>

              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value === 'it' ? 'it' : 'en')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="en">English</option>
                <option value="it">Italiano</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dailyCheckIn')}</h3>
            <div className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-900 dark:text-white">{t('enableDailyCheckIn')}</span>
                <input
                  type="checkbox"
                  checked={dailyCheckInEnabled}
                  onChange={(event) => setDailyCheckInEnabled(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-900 dark:text-white">{t('reminderTime')}</span>
                <input
                  type="time"
                  value={dailyCheckInTime}
                  onChange={(event) => setDailyCheckInTime(event.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </label>

              <button
                onClick={handleRequestPermission}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span>{t('requestPermission')}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('backups')}</h3>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 mt-0.5 text-amber-700 dark:text-amber-300" />
                <div className="text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-medium">{t('lastBackupCreated')}</p>
                  <p>{lastBackupText}</p>
                  {lastBackupFilename && <p className="text-xs mt-1 break-all">{lastBackupFilename}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleCreateBackup}
                disabled={isHandlingBackup}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{t('createBackup')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('createBackupDesc')}</div>
                </div>
              </button>

              <button
                onClick={() => backupFileInputRef.current?.click()}
                disabled={isHandlingBackup}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-cyan-700 dark:text-cyan-300" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{t('importBackup')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('importBackupDesc')}</div>
                </div>
              </button>
            </div>

            <input
              ref={backupFileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportBackup}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dataManagement')}</h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting || addictions.length === 0}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{t('exportCsv')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('exportCsvDesc')}</div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => handleExport('tsv')}
                disabled={isExporting || addictions.length === 0}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Table className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{t('exportTsv')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('exportTsvDesc')}</div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsDialog;
