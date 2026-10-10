import { Addiction, TriggerTag } from '../types';
import { getUrges } from './urgeStats';

// The app already knew which weekday a user relapses on. Once urges are
// recorded too there is enough signal to narrow that to an hour, which is the
// difference between a reminder that arrives at a random time and one that
// arrives just before the window the user actually struggles in.

export interface RiskWindow {
  weekday: number; // 0 = Sunday, matching Date#getDay
  hour: number;    // 0-23, local time
  score: number;
  events: number;
  // The tracker that struggles most in this window, and what tends to be going
  // on, so a nudge can name the plan that fits instead of "have a plan ready".
  addictionId?: string;
  triggers?: TriggerTag[];
}

interface RiskEvent {
  date: Date;
  weight: number;
  addictionId: string;
  triggers: TriggerTag[];
}

interface Bucket extends RiskWindow {
  byAddiction: Map<string, number>;
  byTrigger: Map<TriggerTag, number>;
}

// A slip is a stronger risk signal than a craving that was ridden out, but a
// resisted urge still marks a moment the user had to fight, so it counts.
const SLIP_WEIGHT = 1;
const RESISTED_WEIGHT = 0.6;

// Recent behaviour describes the user better than behaviour from six months
// ago; weight decays by half every `halfLifeDays`.
const DEFAULT_HALF_LIFE_DAYS = 60;

// A craving rarely lands on the hour, so an event at 20:40 should also count
// towards the 21:00 bucket. Without this, one window splits in two and neither
// half clears the threshold.
const NEIGHBOUR_WEIGHT = 0.5;

const DAY_MS = 24 * 60 * 60 * 1000;

const collectEvents = (addictions: Addiction[]): RiskEvent[] => {
  const events: RiskEvent[] = [];

  addictions.forEach(addiction => {
    (addiction.notes ?? []).forEach(note => {
      const date = new Date(note.date);
      if (!Number.isNaN(date.getTime())) {
        events.push({ date, weight: SLIP_WEIGHT, addictionId: addiction.id, triggers: note.triggers ?? [] });
      }
    });

    getUrges(addiction).forEach(urge => {
      // Urges that ended in a slip are already represented by their relapse.
      if (urge.outcome === 'relapsed') return;
      const date = new Date(urge.date);
      if (!Number.isNaN(date.getTime())) {
        events.push({ date, weight: RESISTED_WEIGHT, addictionId: addiction.id, triggers: urge.triggers ?? [] });
      }
    });
  });

  return events;
};

const bucketKey = (weekday: number, hour: number): string => `${weekday}:${hour}`;

export interface RiskWindowOptions {
  limit?: number;
  // Below this many events there is not enough signal to claim a pattern, and
  // guessing one would move the reminder somewhere arbitrary.
  minEvents?: number;
  halfLifeDays?: number;
  now?: Date;
}

export const getRiskWindows = (
  addictions: Addiction[],
  { limit = 3, minEvents = 5, halfLifeDays = DEFAULT_HALF_LIFE_DAYS, now = new Date() }: RiskWindowOptions = {}
): RiskWindow[] => {
  const events = collectEvents(addictions);

  if (events.length < minEvents) {
    return [];
  }

  const buckets = new Map<string, Bucket>();

  const add = (weekday: number, hour: number, score: number, event: RiskEvent | null) => {
    const key = bucketKey(weekday, hour);
    const bucket = buckets.get(key) ?? {
      weekday,
      hour,
      score: 0,
      events: 0,
      byAddiction: new Map<string, number>(),
      byTrigger: new Map<TriggerTag, number>()
    };
    bucket.score += score;
    if (event) {
      bucket.events += 1;
      bucket.byAddiction.set(event.addictionId, (bucket.byAddiction.get(event.addictionId) ?? 0) + score);
      event.triggers.forEach(tag => bucket.byTrigger.set(tag, (bucket.byTrigger.get(tag) ?? 0) + score));
    }
    buckets.set(key, bucket);
  };

  events.forEach(event => {
    const { date, weight } = event;
    const ageDays = Math.max(0, (now.getTime() - date.getTime()) / DAY_MS);
    const recency = Math.pow(0.5, ageDays / halfLifeDays);
    const score = weight * recency;

    const weekday = date.getDay();
    const hour = date.getHours();

    add(weekday, hour, score, event);
    // Spilling into the neighbouring hours has to wrap the weekday too, or a
    // 23:xx event would leak into hour 24 of the same day.
    const before = new Date(date.getTime() - 60 * 60 * 1000);
    const after = new Date(date.getTime() + 60 * 60 * 1000);
    add(before.getDay(), before.getHours(), score * NEIGHBOUR_WEIGHT, null);
    add(after.getDay(), after.getHours(), score * NEIGHBOUR_WEIGHT, null);
  });

  const topKeys = <K,>(map: Map<K, number>): K[] => (
    Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([key]) => key)
  );

  return Array.from(buckets.values())
    // A bucket that only ever received spill-over from a neighbour is not a
    // window in its own right.
    .filter(bucket => bucket.events > 0)
    .sort((a, b) => b.score - a.score || b.events - a.events)
    .slice(0, limit)
    .map(({ byAddiction, byTrigger, ...window }) => {
      const triggers = topKeys(byTrigger).slice(0, 2);
      return {
        ...window,
        addictionId: topKeys(byAddiction)[0],
        triggers: triggers.length > 0 ? triggers : undefined
      };
    });
};

// The window the user is in, or about to be in: from `leadMinutes` before it
// starts until the end of its hour. Null outside every window.
export const getActiveRiskWindow = (
  windows: RiskWindow[],
  leadMinutes: number,
  now: Date = new Date()
): RiskWindow | null => {
  const nowMinutes = now.getDay() * 24 * 60 + now.getHours() * 60 + now.getMinutes();
  const weekMinutes = 7 * 24 * 60;

  return windows.find(window => {
    const start = window.weekday * 24 * 60 + window.hour * 60;
    // Distance from the window's start to now, wrapped around the week.
    const offset = ((nowMinutes - start) % weekMinutes + weekMinutes) % weekMinutes;
    return offset < 60 || offset >= weekMinutes - leadMinutes;
  }) ?? null;
};

// Where in the week a nudge for `window` actually lands. Subtracting the lead
// time can cross midnight, which moves the nudge onto the previous weekday --
// getting this wrong would schedule a Friday-evening nudge for Friday morning.
export const getFireSlot = (window: RiskWindow, leadMinutes: number): { weekday: number; minutes: number } => {
  const raw = window.hour * 60 - leadMinutes;
  const minutes = ((raw % (24 * 60)) + 24 * 60) % (24 * 60);
  const dayShift = raw < 0 ? -1 : 0;
  return { weekday: (window.weekday + dayShift + 7) % 7, minutes };
};

// The next moment a nudge for `window` should fire: the window's next
// occurrence, minus the lead time.
export const getNextOccurrence = (
  window: RiskWindow,
  leadMinutes: number,
  now: Date = new Date()
): Date => {
  const windowAt = new Date(now);
  windowAt.setHours(window.hour, 0, 0, 0);
  windowAt.setDate(windowAt.getDate() + ((window.weekday - windowAt.getDay() + 7) % 7));

  const toFireAt = () => new Date(windowAt.getTime() - leadMinutes * 60 * 1000);

  if (toFireAt().getTime() <= now.getTime()) {
    // Step the window itself rather than adding 7x24h to the fire time, so a
    // DST change does not drag the nudge an hour off its window.
    windowAt.setDate(windowAt.getDate() + 7);
  }

  return toFireAt();
};

// "20:00" for the window itself; pass a lead to format the nudge time instead.
export const formatWindowTime = (window: RiskWindow, leadMinutes = 0): string => {
  const raw = window.hour * 60 - leadMinutes;
  const normalized = ((raw % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(normalized / 60)).padStart(2, '0');
  const mm = String(normalized % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};
