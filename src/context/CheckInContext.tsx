import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DailyCheckIn, DailyIntention, FollowThrough, JournalData, WeeklyReview } from '../types';
import {
  createReviewId,
  sanitizeCheckIns,
  sanitizeIntentions,
  sanitizeReviews,
  toDayKey
} from '../utils/dataValidation';

export const CHECK_INS_KEY = 'dailyCheckIns';
export const INTENTIONS_KEY = 'dailyIntentions';
export const REVIEWS_KEY = 'weeklyReviews';

export interface CheckInInput {
  mood: number;
  cravingIntensity: number;
  note?: string;
}

export interface IntentionInput {
  riskMoment: string;
  action: string;
  addictionId?: string;
}

export interface ReviewInput {
  focus: string;
  addictionId?: string;
  // How the focus chosen in the previous review went.
  previousOutcome?: FollowThrough;
}

interface CheckInContextType {
  checkIns: DailyCheckIn[];
  todaysCheckIn: DailyCheckIn | null;
  recordCheckIn: (input: CheckInInput) => void;
  intentions: DailyIntention[];
  todaysIntention: DailyIntention | null;
  setIntention: (input: IntentionInput) => void;
  recordIntentionOutcome: (date: string, outcome: FollowThrough) => void;
  reviews: WeeklyReview[];
  latestReview: WeeklyReview | null;
  saveReview: (input: ReviewInput) => void;
  journal: JournalData;
  replaceJournal: (next: Partial<Record<keyof JournalData, unknown>>) => void;
}

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

const readStored = <T,>(key: string, sanitize: (value: unknown) => T[]): T[] => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    return sanitize(JSON.parse(raw));
  } catch (error) {
    console.error(`Error parsing saved ${key}:`, error);
    localStorage.removeItem(key);
    return [];
  }
};

const usePersisted = <T,>(key: string, value: T[]) => {
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, value]);
};

export const CheckInProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>(() => readStored(CHECK_INS_KEY, sanitizeCheckIns));
  const [intentions, setIntentions] = useState<DailyIntention[]>(() => readStored(INTENTIONS_KEY, sanitizeIntentions));
  const [reviews, setReviews] = useState<WeeklyReview[]>(() => readStored(REVIEWS_KEY, sanitizeReviews));

  usePersisted(CHECK_INS_KEY, checkIns);
  usePersisted(INTENTIONS_KEY, intentions);
  usePersisted(REVIEWS_KEY, reviews);

  const todayKey = toDayKey(new Date());
  const todaysCheckIn = checkIns.find(entry => entry.date === todayKey) ?? null;
  const todaysIntention = intentions.find(entry => entry.date === todayKey) ?? null;
  const latestReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;

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

  // Rewriting the morning's intention starts the day's answer over: an outcome
  // given for the old plan says nothing about the new one.
  const setIntention = (input: IntentionInput) => {
    const now = new Date();
    const entry: DailyIntention = {
      date: toDayKey(now),
      riskMoment: input.riskMoment.trim(),
      action: input.action.trim(),
      addictionId: input.addictionId,
      setAt: now
    };

    setIntentions(prev => sanitizeIntentions([...prev, entry]));
  };

  const recordIntentionOutcome = (date: string, outcome: FollowThrough) => {
    setIntentions(prev => prev.map(entry => (
      entry.date === date ? { ...entry, outcome, reviewedAt: new Date() } : entry
    )));
  };

  // The previous focus gets its answer in the same update that starts the new
  // week, so the review history always reads as "chose X, it went Y".
  const saveReview = (input: ReviewInput) => {
    const review: WeeklyReview = {
      id: createReviewId(),
      createdAt: new Date(),
      focus: input.focus.trim(),
      addictionId: input.addictionId
    };

    setReviews(prev => {
      const updated = prev.map((entry, index) => (
        index === prev.length - 1 && input.previousOutcome
          ? { ...entry, outcome: input.previousOutcome }
          : entry
      ));
      return sanitizeReviews([...updated, review]);
    });
  };

  const journal = useMemo<JournalData>(
    () => ({ checkIns, intentions, reviews }),
    [checkIns, intentions, reviews]
  );

  // A field missing from `next` is left alone: backups written before
  // intentions or reviews existed must not wipe the ones on this device.
  const replaceJournal = (next: Partial<Record<keyof JournalData, unknown>>) => {
    if (next.checkIns !== undefined) {
      setCheckIns(sanitizeCheckIns(next.checkIns));
    }
    if (next.intentions !== undefined) {
      setIntentions(sanitizeIntentions(next.intentions));
    }
    if (next.reviews !== undefined) {
      setReviews(sanitizeReviews(next.reviews));
    }
  };

  const value = useMemo(
    () => ({
      checkIns,
      todaysCheckIn,
      recordCheckIn,
      intentions,
      todaysIntention,
      setIntention,
      recordIntentionOutcome,
      reviews,
      latestReview,
      saveReview,
      journal,
      replaceJournal
    }),
    // The actions only close over state setters, which React keeps stable.
    [checkIns, todaysCheckIn, intentions, todaysIntention, reviews, latestReview, journal]
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
