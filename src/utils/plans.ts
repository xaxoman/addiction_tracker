import { Addiction, CopingPlan, TriggerTag } from '../types';
import { getUrges } from './urgeStats';

// How a plan has done whenever the user said they used it. Only urges carry a
// plan, and a relapse logged from the craving screen is an urge too, so every
// use is counted exactly once.
export interface PlanStats {
  used: number;
  worked: number;
  // 0-1, or null until the plan has been tried at least once.
  rate: number | null;
}

export const getPlans = (addiction: Addiction): CopingPlan[] => (
  (addiction.copingPlans ?? []).filter(plan => plan.cue || plan.action)
);

export const getPlanStats = (addiction: Addiction): Map<string, PlanStats> => {
  const stats = new Map<string, PlanStats>();

  getPlans(addiction).forEach(plan => {
    stats.set(plan.id, { used: 0, worked: 0, rate: null });
  });

  getUrges(addiction).forEach(urge => {
    const entry = urge.planId ? stats.get(urge.planId) : undefined;
    if (!entry) return;
    entry.used += 1;
    if (urge.outcome === 'resisted') {
      entry.worked += 1;
    }
  });

  stats.forEach(entry => {
    entry.rate = entry.used > 0 ? entry.worked / entry.used : null;
  });

  return stats;
};

const countMatches = (plan: CopingPlan, triggers: TriggerTag[]): number => (
  (plan.triggers ?? []).filter(tag => triggers.includes(tag)).length
);

export interface RankedPlan {
  plan: CopingPlan;
  stats: PlanStats;
  matches: number;
}

// Plans for what is happening right now come first, then the ones that have
// worked best. An untried plan sorts after a proven one but ahead of one that
// keeps failing, so a new idea still gets its chance.
export const rankPlans = (addiction: Addiction, triggers: TriggerTag[] = []): RankedPlan[] => {
  const stats = getPlanStats(addiction);
  const score = (entry: RankedPlan): number => (entry.stats.rate === null ? 0.5 : entry.stats.rate);

  return getPlans(addiction)
    .map(plan => ({
      plan,
      stats: stats.get(plan.id) ?? { used: 0, worked: 0, rate: null },
      matches: countMatches(plan, triggers)
    }))
    .sort((a, b) => (
      b.matches - a.matches ||
      score(b) - score(a) ||
      b.stats.used - a.stats.used
    ));
};

// The single plan to name in a nudge or a suggestion, if there is one.
export const pickPlan = (addiction: Addiction, triggers: TriggerTag[] = []): CopingPlan | null => (
  rankPlans(addiction, triggers)[0]?.plan ?? null
);

// Plans whose track record says they are not doing their job.
export const isStruggling = (stats: PlanStats): boolean => (
  stats.used >= 2 && stats.rate !== null && stats.rate < 0.5
);

type Translate = (key: string, params?: Record<string, string | number>) => string;

// The "if" half as the user reads it. Plans written by hand have their own cue;
// ones created from a debrief or a suggestion may only carry trigger tags.
export const getPlanCueText = (plan: CopingPlan, t: Translate): string => (
  plan.cue || (plan.triggers ?? []).map(tag => t(`trigger_${tag}`)).join(', ')
);

// Default cue for a plan created from a set of triggers, stored as text so it
// can be edited like any other plan afterwards.
export const buildCueFromTriggers = (triggers: TriggerTag[], t: Translate): string => (
  triggers.map(tag => t(`trigger_${tag}`)).join(', ')
);

export const formatPlanStats = (stats: PlanStats, t: Translate): string => {
  if (stats.used === 0) {
    return t('planNotTriedYet');
  }
  // One try reads better as a sentence than as "1 of 1 times".
  if (stats.used === 1) {
    return t(stats.worked === 1 ? 'planWorkedOnce' : 'planFailedOnce');
  }
  return t('planWorkedCount', { worked: stats.worked, used: stats.used });
};
