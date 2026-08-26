import { Addiction } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

// Compact, human-readable elapsed time. Rolls hours up into days so the
// value never grows unbounded (e.g. 2762h -> 115d 6h 49m). Seconds are only
// shown for short durations where the live ticker is meaningful.
export const formatElapsed = (days: number, hours: number, minutes: number, seconds: number): string => {
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

// Time-based savings are accumulated in minutes; roll them up into
// hours and days so large totals stay readable (e.g. 1725 min -> 1d 4h).
export const formatMinutesSaved = (totalMinutes: number): string => {
  const mins = Math.max(0, Math.round(totalMinutes));
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// mm:ss, for the panic screen countdown.
export const formatClock = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const getDaysSince = (lastEngaged: Date | string, now: Date = new Date()): number => {
  const anchor = new Date(lastEngaged).getTime();
  if (Number.isNaN(anchor) || Number.isNaN(now.getTime())) {
    return 0;
  }
  const diffDays = Math.floor(Math.abs(now.getTime() - anchor) / DAY_MS);
  return Number.isNaN(diffDays) ? 0 : Math.max(0, diffDays);
};

export const getSavedAmount = (addiction: Addiction, now: Date = new Date()): number => {
  const costValue = typeof addiction.cost === 'number' && !isNaN(addiction.cost) ? addiction.cost : 0;
  const savedAmount = costValue * getDaysSince(addiction.lastEngaged, now);
  return isNaN(savedAmount) ? 0 : Math.max(0, savedAmount);
};

export const getSavedLabel = (addiction: Addiction, now: Date = new Date()): string => {
  const amount = getSavedAmount(addiction, now);
  switch (addiction.costType) {
    case 'money':
      return `$${amount.toFixed(2)}`;
    case 'time':
      return formatMinutesSaved(amount);
    case 'health':
      return `${amount} impact`;
    default:
      return `${amount}`;
  }
};

// "4m 20s" / "12m" — how long the user stayed with a craving.
export const formatHeldDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
};
