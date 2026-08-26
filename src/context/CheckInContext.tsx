import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DailyCheckIn } from '../types';
import { sanitizeCheckIns, toDayKey } from '../utils/dataValidation';

export const CHECK_INS_KEY = 'dailyCheckIns';

export interface CheckInInput {
  mood: number;
  cravingIntensity: number;
  note?: string;
}

interface CheckInContextType {
  checkIns: DailyCheckIn[];
  todaysCheckIn: DailyCheckIn | null;
  recordCheckIn: (input: CheckInInput) => void;
  replaceCheckIns: (next: unknown) => void;
}

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

const readStoredCheckIns = (): DailyCheckIn[] => {
  const raw = localStorage.getItem(CHECK_INS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return sanitizeCheckIns(JSON.parse(raw));
  } catch (error) {
    console.error('Error parsing saved check-ins:', error);
    localStorage.removeItem(CHECK_INS_KEY);
    return [];
  }
};

export const CheckInProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>(readStoredCheckIns);

  useEffect(() => {
    try {
      localStorage.setItem(CHECK_INS_KEY, JSON.stringify(checkIns));
    } catch (error) {
      console.error('Error saving check-ins to localStorage:', error);
    }
  }, [checkIns]);

  const todayKey = toDayKey(new Date());
  const todaysCheckIn = checkIns.find(entry => entry.date === todayKey) ?? null;

  // Checking in twice on the same day corrects that day rather than adding a
  // second entry, so the series stays one point per day.
  const recordCheckIn = (input: CheckInInput) => {
    const now = new Date();
    const entry: DailyCheckIn = {
      date: toDayKey(now),
      mood: input.mood,
      cravingIntensity: input.cravingIntensity,
      note: input.note?.trim() || undefined,
      recordedAt: now
    };

    setCheckIns(prev => sanitizeCheckIns([...prev, entry]));
  };

  const replaceCheckIns = (next: unknown) => {
    setCheckIns(sanitizeCheckIns(next));
  };

  const value = useMemo(
    () => ({ checkIns, todaysCheckIn, recordCheckIn, replaceCheckIns }),
    [checkIns, todaysCheckIn]
  );

  return <CheckInContext.Provider value={value}>{children}</CheckInContext.Provider>;
};

export const useCheckIns = (): CheckInContextType => {
  const context = useContext(CheckInContext);
  if (!context) {
    throw new Error('useCheckIns must be used within a CheckInProvider');
  }
  return context;
};
