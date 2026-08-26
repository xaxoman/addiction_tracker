import React, { createContext, useContext, useMemo, useState } from 'react';

export type AppLanguage = 'en' | 'it';

export const APP_LANGUAGE_KEY = 'appLanguage';
export const DAILY_CHECKIN_ENABLED_KEY = 'dailyCheckInEnabled';
export const DAILY_CHECKIN_TIME_KEY = 'dailyCheckInTime';
export const RISK_NUDGES_ENABLED_KEY = 'riskNudgesEnabled';
export const MILESTONE_ALERTS_ENABLED_KEY = 'milestoneAlertsEnabled';
export const EMERGENCY_CONTACT_KEY = 'emergencyContact';

export interface EmergencyContact {
  name: string;
  phone: string;
}

interface AppSettingsContextType {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  dailyCheckInEnabled: boolean;
  setDailyCheckInEnabled: (enabled: boolean) => void;
  dailyCheckInTime: string;
  setDailyCheckInTime: (time: string) => void;
  riskNudgesEnabled: boolean;
  setRiskNudgesEnabled: (enabled: boolean) => void;
  milestoneAlertsEnabled: boolean;
  setMilestoneAlertsEnabled: (enabled: boolean) => void;
  emergencyContact: EmergencyContact | null;
  setEmergencyContact: (contact: EmergencyContact | null) => void;
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

// The emergency contact is deliberately kept out of the backup/sync payload:
// it is somebody else's phone number, and the user only agreed to store it on
// this device.
const readEmergencyContact = (): EmergencyContact | null => {
  const raw = localStorage.getItem(EMERGENCY_CONTACT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<EmergencyContact>;
    const name = typeof parsed?.name === 'string' ? parsed.name.trim() : '';
    const phone = typeof parsed?.phone === 'string' ? parsed.phone.trim() : '';
    return phone ? { name, phone } : null;
  } catch {
    localStorage.removeItem(EMERGENCY_CONTACT_KEY);
    return null;
  }
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
  const [riskNudgesEnabled, setRiskNudgesEnabledState] = useState<boolean>(() => {
    return normalizeBoolean(localStorage.getItem(RISK_NUDGES_ENABLED_KEY), false);
  });
  const [milestoneAlertsEnabled, setMilestoneAlertsEnabledState] = useState<boolean>(() => {
    return normalizeBoolean(localStorage.getItem(MILESTONE_ALERTS_ENABLED_KEY), false);
  });
  const [emergencyContact, setEmergencyContactState] = useState<EmergencyContact | null>(readEmergencyContact);

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

  const setRiskNudgesEnabled = (enabled: boolean) => {
    setRiskNudgesEnabledState(enabled);
    localStorage.setItem(RISK_NUDGES_ENABLED_KEY, String(enabled));
  };

  const setMilestoneAlertsEnabled = (enabled: boolean) => {
    setMilestoneAlertsEnabledState(enabled);
    localStorage.setItem(MILESTONE_ALERTS_ENABLED_KEY, String(enabled));
  };

  const setEmergencyContact = (contact: EmergencyContact | null) => {
    const normalized = contact && contact.phone.trim()
      ? { name: contact.name.trim(), phone: contact.phone.trim() }
      : null;

    setEmergencyContactState(normalized);

    if (normalized) {
      localStorage.setItem(EMERGENCY_CONTACT_KEY, JSON.stringify(normalized));
    } else {
      localStorage.removeItem(EMERGENCY_CONTACT_KEY);
    }
  };

  const value = useMemo(
    () => ({
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
    }),
    [language, dailyCheckInEnabled, dailyCheckInTime, riskNudgesEnabled, milestoneAlertsEnabled, emergencyContact]
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
