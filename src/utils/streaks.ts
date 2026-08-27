import { Addiction } from '../types';
import { getDaysSince } from './format';

const DAY_MS = 24 * 60 * 60 * 1000;

const toTime = (value: Date | string | undefined): number | null => {
  if (value === undefined) {
    return null;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

export interface StreakStats {
  // Days since the most recent relapse (or since the tracker's anchor date).
  current: number;
  // The longest run the tracker has ever held, current run included.
  best: number;
}

// Every relapse stores the anchor it replaced, so a past streak is simply the
// gap between a relapse and its own `previousLastEngaged`. Older entries
// written before anchors were stored fall back to the relapse before them.
export const getStreakStats = (addiction: Addiction, now: Date = new Date()): StreakStats => {
  const current = getDaysSince(addiction.lastEngaged, now);

  const relapses = (addiction.notes ?? [])
    .map(entry => ({ at: toTime(entry.date), from: toTime(entry.previousLastEngaged) }))
    .filter((entry): entry is { at: number; from: number | null } => entry.at !== null)
    .sort((a, b) => a.at - b.at);

  let best = current;
  let previous = toTime(addiction.createdAt);

  relapses.forEach(relapse => {
    const start = relapse.from ?? previous;
    if (start !== null) {
      best = Math.max(best, Math.floor(Math.max(0, relapse.at - start) / DAY_MS));
    }
    previous = relapse.at;
  });

  return { current, best };
};

export interface DaysCleanPoint {
  date: Date;
  days: number;
}

// Days clean as it stood at the end of each of the last `rangeDays` days. The
// series sawtooths down to zero on every relapse, which is exactly the shape
// the progress chart is meant to show.
export const getDaysCleanSeries = (
  addiction: Addiction,
  rangeDays: number,
  now: Date = new Date()
): DaysCleanPoint[] => {
  const anchors = [
    ...(addiction.notes ?? []).map(note => toTime(note.date)),
    toTime(addiction.lastEngaged)
  ]
    .filter((time): time is number => time !== null)
    .sort((a, b) => a - b);

  const points: DaysCleanPoint[] = [];

  for (let offset = rangeDays - 1; offset >= 0; offset--) {
    const day = new Date(now);
    day.setDate(now.getDate() - offset);

    // Today is measured at "now" rather than at midnight, so the last point
    // always matches the streak shown on the hero card.
    const end = offset === 0
      ? now.getTime()
      : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();

    let anchor: number | null = null;
    for (const time of anchors) {
      if (time <= end) {
        anchor = time;
      }
    }

    points.push({
      date: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
      days: anchor === null ? 0 : Math.max(0, Math.floor((end - anchor) / DAY_MS))
    });
  }

  return points;
};
