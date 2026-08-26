// Streak milestones. Loss aversion is the point: "next milestone in 6 hours",
// shown while a craving is peaking, does work that a raw day counter does not.

export interface Milestone {
  id: string;
  hours: number;
  // Key into the i18n dictionary, so the label follows the app language.
  labelKey: string;
  emoji: string;
}

export const MILESTONES: Milestone[] = [
  { id: '24h', hours: 24, labelKey: 'milestone24h', emoji: '🌱' },
  { id: '3d', hours: 24 * 3, labelKey: 'milestone3d', emoji: '🌿' },
  { id: '7d', hours: 24 * 7, labelKey: 'milestone7d', emoji: '🔥' },
  { id: '30d', hours: 24 * 30, labelKey: 'milestone30d', emoji: '⭐' },
  { id: '90d', hours: 24 * 90, labelKey: 'milestone90d', emoji: '💎' },
  { id: '1y', hours: 24 * 365, labelKey: 'milestone1y', emoji: '🏆' }
];

const HOUR_MS = 60 * 60 * 1000;

export interface MilestoneState {
  elapsedMs: number;
  reached: Milestone[];
  // The highest milestone already earned, i.e. the badge to show on the card.
  latest?: Milestone;
  next?: Milestone;
  msUntilNext?: number;
  // 0-1 progress from the last milestone to the next one, for a progress bar.
  progressToNext: number;
}

export const getMilestoneState = (lastEngaged: Date | string, now: Date = new Date()): MilestoneState => {
  const anchor = new Date(lastEngaged).getTime();
  const reference = now.getTime();

  if (Number.isNaN(anchor) || Number.isNaN(reference)) {
    return { elapsedMs: 0, reached: [], next: MILESTONES[0], msUntilNext: MILESTONES[0].hours * HOUR_MS, progressToNext: 0 };
  }

  const elapsedMs = Math.max(0, reference - anchor);
  const reached = MILESTONES.filter(milestone => elapsedMs >= milestone.hours * HOUR_MS);
  const next = MILESTONES.find(milestone => elapsedMs < milestone.hours * HOUR_MS);

  if (!next) {
    // Past the last milestone: nothing left to count down to.
    return {
      elapsedMs,
      reached,
      latest: reached[reached.length - 1],
      progressToNext: 1
    };
  }

  const previousMs = reached.length > 0 ? reached[reached.length - 1].hours * HOUR_MS : 0;
  const span = next.hours * HOUR_MS - previousMs;

  return {
    elapsedMs,
    reached,
    latest: reached[reached.length - 1],
    next,
    msUntilNext: next.hours * HOUR_MS - elapsedMs,
    progressToNext: span > 0 ? Math.min(1, Math.max(0, (elapsedMs - previousMs) / span)) : 0
  };
};

// "6h 12m" / "2d 4h" / "45m" — deliberately coarse, because a milestone that is
// still days away does not need to tick by the second.
export const formatCountdown = (ms: number): string => {
  const totalMinutes = Math.max(0, Math.ceil(ms / (60 * 1000)));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// The moment a streak will hit `milestone`, or null once it already has.
export const getMilestoneDate = (lastEngaged: Date | string, milestone: Milestone): Date | null => {
  const anchor = new Date(lastEngaged).getTime();
  if (Number.isNaN(anchor)) {
    return null;
  }
  const at = new Date(anchor + milestone.hours * HOUR_MS);
  return at.getTime() > Date.now() ? at : null;
};

export interface UpcomingMilestone {
  addictionId: string;
  addictionName: string;
  milestone: Milestone;
  at: Date;
}

// The next milestone each tracker is heading for, soonest first. Used to turn
// "you are 6 hours from a week clean" into an actual notification.
export const getUpcomingMilestones = (
  addictions: { id: string; name: string; lastEngaged: Date | string }[],
  limit = 10
): UpcomingMilestone[] => {
  const upcoming: UpcomingMilestone[] = [];

  addictions.forEach(addiction => {
    const state = getMilestoneState(addiction.lastEngaged);
    if (!state.next) {
      return;
    }
    const at = getMilestoneDate(addiction.lastEngaged, state.next);
    if (!at) {
      return;
    }
    upcoming.push({
      addictionId: addiction.id,
      addictionName: addiction.name,
      milestone: state.next,
      at
    });
  });

  return upcoming.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit);
};
