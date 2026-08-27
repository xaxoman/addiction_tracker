import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Moon, Sun, Download, FileText, Table, Languages, Upload, Clock, Bell, Phone, Target, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAddictions } from '../context/AddictionContext';
import { useCheckIns } from '../context/CheckInContext';
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
import { formatWindowTime, getRiskWindows } from '../utils/riskWindows';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addictions: Addiction[];
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, addictions }) => {
  const { theme, toggleTheme, setThemeMode } = useTheme();
  const { replaceAddictions } = useAddictions();
  const { checkIns, replaceCheckIns } = useCheckIns();
  const {
    language,
    setLanguage,
    dailyCheckInEnabled,
    setDailyCheckInEnabled,
    dailyCheckInTime,
    setDailyCheckInTime,
    riskNudgesEnabled,
    setRiskNudgesEnabled,
    milestoneAlertsEnabled,
    setMilestoneAlertsEnabled,
    emergencyContact,
    setEmergencyContact
  } = useAppSettings();
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);
  const [isHandlingBackup, setIsHandlingBackup] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [lastBackupFilename, setLastBackupFilename] = useState<string | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const [contactName, setContactName] = useState(emergencyContact?.name ?? '');
  const [contactPhone, setContactPhone] = useState(emergencyContact?.phone ?? '');

  // The user's own high-risk windows, shown so the nudge times are never a
  // black box: they can see exactly what the app worked out about them.
  const riskWindows = useMemo(() => getRiskWindows(addictions), [addictions]);

  const weekdayLabel = (index: number): string => (
    t(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][index])
  );

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
      const { backup, filename } = await createBackup(addictions, theme, 'manual', checkIns);
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
      // Absent in backups written before check-ins existed; importing one must
      // not silently wipe the series on this device.
      if (backup.data.checkIns) {
        replaceCheckIns(backup.data.checkIns);
      }
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
        className="bg-white dark:bg-sage-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-sage-200 dark:border-sage-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-sage-900 dark:text-white">{t('settings')}</h2>
          <button
            onClick={onClose}
            className="text-sage-500 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-sage-700 dark:text-sage-300">{t('appearance')}</h3>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 border border-sage-200 dark:border-sage-700 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-700/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sage-100 dark:bg-sage-800 rounded-lg flex items-center justify-center">
                  {theme === 'light' ? (
                    <Sun className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-brand-400" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-medium text-sage-900 dark:text-white">{t('theme')}</div>
                  <div className="text-sm text-sage-500 dark:text-sage-400">
                    {theme === 'light' ? t('switchToDark') : t('switchToLight')}
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-sage-700 dark:text-sage-300">{t('language')}</h3>
            <div className="w-full p-4 border border-sage-200 dark:border-sage-700 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-brand-50 dark:bg-brand-500/15 rounded-xl flex items-center justify-center">
                  <Languages className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sage-900 dark:text-white">{t('appLanguage')}</div>
                </div>
              </div>

              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value === 'it' ? 'it' : 'en')}
                className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl bg-white dark:bg-sage-700 text-sage-900 dark:text-white"
              >
                <option value="en">English</option>
                <option value="it">Italiano</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-sage-700 dark:text-sage-300">{t('dailyCheckIn')}</h3>
            <div className="w-full p-4 border border-sage-200 dark:border-sage-700 rounded-lg space-y-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-sage-900 dark:text-white">{t('enableDailyCheckIn')}</span>
                <input
                  type="checkbox"
                  checked={dailyCheckInEnabled}
                  onChange={(event) => setDailyCheckInEnabled(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              <label className="block">
                <span className="text-sm text-sage-900 dark:text-white">{t('reminderTime')}</span>
                <input
                  type="time"
                  value={dailyCheckInTime}
                  onChange={(event) => setDailyCheckInTime(event.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl bg-white dark:bg-sage-700 text-sage-900 dark:text-white"
                />
              </label>

              <button
                onClick={handleRequestPermission}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-800 dark:text-brand-200 hover:bg-brand-200 dark:hover:bg-brand-900/60 transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span>{t('requestPermission')}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-sage-700 dark:text-sage-300">{t('riskNudges')}</h3>
            <div className="w-full p-4 border border-sage-200 dark:border-sage-700 rounded-lg space-y-3">
              <p className="text-xs text-sage-500 dark:text-sage-400">{t('riskNudgesDesc')}</p>

              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-sage-900 dark:text-white">{t('enableRiskNudges')}</span>
                <input
                  type="checkbox"
                  checked={riskNudgesEnabled}
                  onChange={(event) => setRiskNudgesEnabled(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              {riskWindows.length === 0 ? (
                <p className="text-xs text-sage-500 dark:text-sage-400">{t('riskNudgesNoData')}</p>
              ) : (
                <div>
                  <p className="text-xs text-sage-500 dark:text-sage-400 mb-1.5">
                    {riskNudgesEnabled ? t('riskNudgesScheduled') : t('riskyWindows')}
                  </p>
                  <ul className="space-y-1">
                    {riskWindows.map((window) => (
                      <li
                        key={`${window.weekday}-${window.hour}`}
                        className="flex items-center justify-between gap-2 text-sm text-sage-900 dark:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          {weekdayLabel(window.weekday)}
                        </span>
                        <span className="tabular-nums">{formatWindowTime(window)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-sage-700 dark:text-sage-300">{t('milestoneAlerts')}</h3>
            <div className="w-full p-4 border border-sage-200 dark:border-sage-700 rounded-lg">
              <label className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-sage-900 dark:text-white">
                  <Target className="w-4 h-4 text-amber-500" />
                  {t('enableMilestoneAlerts')}
                </span>
                <input
                  type="checkbox"
                  checked={milestoneAlertsEnabled}
                  onChange={(event) => setMilestoneAlertsEnabled(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-sage-700 dark:text-sage-300">{t('emergencyContact')}</h3>
            <div className="w-full p-4 border border-sage-200 dark:border-sage-700 rounded-lg space-y-3">
              <p className="text-xs text-sage-500 dark:text-sage-400">{t('emergencyContactDesc')}</p>

              <label className="block">
                <span className="text-sm text-sage-900 dark:text-white">{t('emergencyContactName')}</span>
                <input
                  type="text"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  onBlur={() => setEmergencyContact({ name: contactName, phone: contactPhone })}
                  className="mt-1 w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl bg-white dark:bg-sage-700 text-sage-900 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="text-sm text-sage-900 dark:text-white">{t('emergencyContactPhone')}</span>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  onBlur={() => setEmergencyContact({ name: contactName, phone: contactPhone })}
                  className="mt-1 w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl bg-white dark:bg-sage-700 text-sage-900 dark:text-white"
                />
              </label>

              {emergencyContact && (
                <button
                  onClick={() => {
                    setContactName('');
                    setContactPhone('');
                    setEmergencyContact(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>{t('clearEmergencyContact')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-sage-700 dark:text-sage-300">{t('backups')}</h3>
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
                className="w-full flex items-center gap-3 p-4 border border-sage-200 dark:border-sage-700 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-sage-900 dark:text-white">{t('createBackup')}</div>
                  <div className="text-sm text-sage-500 dark:text-sage-400">{t('createBackupDesc')}</div>
                </div>
              </button>

              <button
                onClick={() => backupFileInputRef.current?.click()}
                disabled={isHandlingBackup}
                className="w-full flex items-center gap-3 p-4 border border-sage-200 dark:border-sage-700 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-cyan-700 dark:text-cyan-300" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-sage-900 dark:text-white">{t('importBackup')}</div>
                  <div className="text-sm text-sage-500 dark:text-sage-400">{t('importBackupDesc')}</div>
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
            <h3 className="text-sm font-medium text-sage-700 dark:text-sage-300">{t('dataManagement')}</h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting || addictions.length === 0}
                className="w-full flex items-center gap-3 p-4 border border-sage-200 dark:border-sage-700 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-sage-900 dark:text-white">{t('exportCsv')}</div>
                  <div className="text-sm text-sage-500 dark:text-sage-400">{t('exportCsvDesc')}</div>
                </div>
                <Download className="w-4 h-4 text-sage-400" />
              </button>

              <button
                onClick={() => handleExport('tsv')}
                disabled={isExporting || addictions.length === 0}
                className="w-full flex items-center gap-3 p-4 border border-sage-200 dark:border-sage-700 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-brand-100 dark:bg-brand-500/15 rounded-xl flex items-center justify-center">
                  <Table className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-sage-900 dark:text-white">{t('exportTsv')}</div>
                  <div className="text-sm text-sage-500 dark:text-sage-400">{t('exportTsvDesc')}</div>
                </div>
                <Download className="w-4 h-4 text-sage-400" />
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
