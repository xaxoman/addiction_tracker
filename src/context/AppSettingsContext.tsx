import React, { createContext, useContext, useMemo, useState } from 'react';

export type AppLanguage = 'en' | 'it';

export const APP_LANGUAGE_KEY = 'appLanguage';
export const DAILY_CHECKIN_ENABLED_KEY = 'dailyCheckInEnabled';
export const DAILY_CHECKIN_TIME_KEY = 'dailyCheckInTime';

interface AppSettingsContextType {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  dailyCheckInEnabled: boolean;
  setDailyCheckInEnabled: (enabled: boolean) => void;
  dailyCheckInTime: string;
  setDailyCheckInTime: (time: string) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

const normalizeLanguage = (value: string | null): AppLanguage => {
  if (value === 'it') {
    return 'it';
  }
  return 'en';
};

const normalizeCheckInTime = (value: string | null): string => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return '20:00';
  }

  const [hours, minutes] = value.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '20:00';
  }

  return value;
};

const normalizeBoolean = (value: string | null, fallback: boolean): boolean => {
  if (value === null) {
    return fallback;
  }
  return value === 'true';
};

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    return normalizeLanguage(localStorage.getItem(APP_LANGUAGE_KEY));
  });
  const [dailyCheckInEnabled, setDailyCheckInEnabledState] = useState<boolean>(() => {
    return normalizeBoolean(localStorage.getItem(DAILY_CHECKIN_ENABLED_KEY), false);
  });
  const [dailyCheckInTime, setDailyCheckInTimeState] = useState<string>(() => {
    return normalizeCheckInTime(localStorage.getItem(DAILY_CHECKIN_TIME_KEY));
  });

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    localStorage.setItem(APP_LANGUAGE_KEY, nextLanguage);
  };

  const setDailyCheckInEnabled = (enabled: boolean) => {
    setDailyCheckInEnabledState(enabled);
    localStorage.setItem(DAILY_CHECKIN_ENABLED_KEY, String(enabled));
  };

  const setDailyCheckInTime = (time: string) => {
    const normalized = normalizeCheckInTime(time);
    setDailyCheckInTimeState(normalized);
    localStorage.setItem(DAILY_CHECKIN_TIME_KEY, normalized);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      dailyCheckInEnabled,
      setDailyCheckInEnabled,
      dailyCheckInTime,
      setDailyCheckInTime
    }),
    [language, dailyCheckInEnabled, dailyCheckInTime]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
};

export const useAppSettings = (): AppSettingsContextType => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
};
