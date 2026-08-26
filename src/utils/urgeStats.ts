import { Addiction, TriggerTag, UrgeEntry } from '../types';

// Urges and relapses together are what make a rate meaningful: relapses alone
// are a numerator with no denominator. A resisted urge is a win the app can
// finally count, and every slip is an urge that was lost — whether or not the
// user opened the panic screen for it.
export interface UrgeSummary {
  resisted: number;
  slips: number;
  total: number;
  // 0-1, or null when nothing has been recorded yet and a rate would be a lie.
  resistedRate: number | null;
}

const isWithin = (date: Date | string, since?: Date): boolean => {
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  return since ? time >= since.getTime() : true;
};

export const getUrges = (addiction: Addiction): UrgeEntry[] => (
  Array.isArray(addiction.urges) ? addiction.urges : []
);

export const summarizeUrges = (addiction: Addiction, since?: Date): UrgeSummary => {
  // Urges that ended in a slip are counted through `notes` instead, so a panic
  // session that ended badly is not counted twice.
  const resisted = getUrges(addiction).filter(
    urge => urge.outcome === 'resisted' && isWithin(urge.date, since)
  ).length;

  const slips = (addiction.notes ?? []).filter(note => isWithin(note.date, since)).length;
  const total = resisted + slips;

  return {
    resisted,
    slips,
    total,
    resistedRate: total > 0 ? resisted / total : null
  };
};

export const startOfCurrentMonth = (now: Date = new Date()): Date => (
  new Date(now.getFullYear(), now.getMonth(), 1)
);

export const startOfDaysAgo = (days: number, now: Date = new Date()): Date => {
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
};

export interface TriggerCount {
  tag: TriggerTag;
  total: number;
  slips: number;
}

// Tag counts across both kinds of event. `slips` is what turns the list into a
// risk model rather than a tally: a tag that shows up often but rarely ends in
// a slip is a trigger the user is already handling.
export const getTopTriggers = (
  addictions: Addiction | Addiction[],
  { limit = 3, since }: { limit?: number; since?: Date } = {}
): TriggerCount[] => {
  const list = Array.isArray(addictions) ? addictions : [addictions];
  const counts = new Map<TriggerTag, TriggerCount>();

  const bump = (tag: TriggerTag, isSlip: boolean) => {
    const entry = counts.get(tag) ?? { tag, total: 0, slips: 0 };
    entry.total += 1;
    if (isSlip) {
      entry.slips += 1;
    }
    counts.set(tag, entry);
  };

  list.forEach(addiction => {
    getUrges(addiction).forEach(urge => {
      if (!isWithin(urge.date, since)) return;
      // A relapsed urge's tags are recorded on the paired relapse too; count
      // them there so the pair contributes once.
      if (urge.outcome === 'relapsed') return;
      (urge.triggers ?? []).forEach(tag => bump(tag, false));
    });

    (addiction.notes ?? []).forEach(note => {
      if (!isWithin(note.date, since)) return;
      (note.triggers ?? []).forEach(tag => bump(tag, true));
    });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.total - a.total || b.slips - a.slips)
    .slice(0, limit);
};

export const formatPercent = (rate: number | null): string => (
  rate === null ? '—' : `${Math.round(rate * 100)}%`
);
