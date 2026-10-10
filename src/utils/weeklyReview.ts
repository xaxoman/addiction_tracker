import { Addiction, DailyCheckIn, DailyIntention, TriggerTag, WeeklyReview } from '../types';
import { getTopTriggers, getUrges, startOfDaysAgo, summarizeUrges, UrgeSummary } from './urgeStats';
import { getNeedInsight, NeedInsight, getAlternativeKeys } from './needs';
import { getPlanStats, getPlans, isStruggling } from './plans';
import { getCleanDays, CleanDays } from './streaks';
import { getRiskWindows, RiskWindow } from './riskWindows';

const DAY_MS = 24 * 60 * 60 * 1000;

// A review is due once the current focus has had its week.
export const REVIEW_INTERVAL_DAYS = 7;

export const isReviewDue = (latest: WeeklyReview | null, now: Date = new Date()): boolean => {
  if (!latest) {
    return true;
  }
  return now.getTime() - new Date(latest.createdAt).getTime() >= (REVIEW_INTERVAL_DAYS - 1) * DAY_MS;
};

// 1-based day of the focus week, capped at the interval.
export const getFocusDay = (review: WeeklyReview, now: Date = new Date()): number => {
  const elapsed = Math.floor((now.getTime() - new Date(review.createdAt).getTime()) / DAY_MS);
  return Math.min(REVIEW_INTERVAL_DAYS, Math.max(1, elapsed + 1));
};

export interface BestPlan {
  action: string;
  worked: number;
  used: number;
}

export interface WeekSummary {
  urges: UrgeSummary;
  cleanDays: { addiction: Addiction; days: CleanDays }[];
  topTrigger?: TriggerTag;
  need: NeedInsight | null;
  bestPlan?: BestPlan;
  intentionsSet: number;
  intentionsKept: number;
  checkInDays: number;
  averageMood: number | null;
}

export const summarizeWeek = (
  addictions: Addiction[],
  checkIns: DailyCheckIn[],
  intentions: DailyIntention[],
  now: Date = new Date()
): WeekSummary => {
  const since = startOfDaysAgo(REVIEW_INTERVAL_DAYS - 1, now);
  const sinceKey = since.getTime();

  const urges = addictions.reduce<UrgeSummary>((total, addiction) => {
    const summary = summarizeUrges(addiction, since);
    const resisted = total.resisted + summary.resisted;
    const slips = total.slips + summary.slips;
    const sum = resisted + slips;
    return { resisted, slips, total: sum, resistedRate: sum > 0 ? resisted / sum : null };
  }, { resisted: 0, slips: 0, total: 0, resistedRate: null });

  // Plans are judged on this week's uses only.
  let bestPlan: BestPlan | undefined;
  addictions.forEach(addiction => {
    const plans = new Map(getPlans(addiction).map(plan => [plan.id, plan]));
    const counts = new Map<string, { used: number; worked: number }>();
    getUrges(addiction).forEach(urge => {
      if (!urge.planId || !plans.has(urge.planId)) return;
      if (new Date(urge.date).getTime() < sinceKey) return;
      const entry = counts.get(urge.planId) ?? { used: 0, worked: 0 };
      entry.used += 1;
      if (urge.outcome === 'resisted') entry.worked += 1;
      counts.set(urge.planId, entry);
    });
    counts.forEach((entry, planId) => {
      if (entry.worked === 0) return;
      if (!bestPlan || entry.worked > bestPlan.worked) {
        bestPlan = { action: plans.get(planId)?.action ?? '', ...entry };
      }
    });
  });

  const weekIntentions = intentions.filter(entry => new Date(`${entry.date}T12:00:00`).getTime() >= sinceKey);
  const weekCheckIns = checkIns.filter(entry => new Date(`${entry.date}T12:00:00`).getTime() >= sinceKey);

  return {
    urges,
    cleanDays: addictions.map(addiction => ({ addiction, days: getCleanDays(addiction, REVIEW_INTERVAL_DAYS, now) })),
    topTrigger: getTopTriggers(addictions, { limit: 1, since })[0]?.tag,
    need: getNeedInsight(addictions, { since }) ?? getNeedInsight(addictions),
    bestPlan,
    intentionsSet: weekIntentions.length,
    intentionsKept: weekIntentions.filter(entry => entry.outcome === 'yes').length,
    checkInDays: weekCheckIns.length,
    averageMood: weekCheckIns.length > 0
      ? weekCheckIns.reduce((sum, entry) => sum + entry.mood, 0) / weekCheckIns.length
      : null
  };
};

// One candidate change, pre-written from the user's own data. `params` are
// filled into the translated `key`; `plan` is set when choosing the suggestion
// should also create an if-then plan.
export interface FocusSuggestion {
  id: string;
  key: string;
  params: Record<string, string | number>;
  // Values that must be translated before they go into `params`.
  translate?: Record<string, string>;
  plan?: {
    addictionId: string;
    triggers?: TriggerTag[];
    // Translation key of the cue when there is no trigger to name.
    cueKey?: string;
    // Translation key of a ready-made action; without one the review asks
    // the user to write it.
    actionKey?: string;
  };
}

export const buildFocusSuggestions = (
  addictions: Addiction[],
  summary: WeekSummary,
  focusAddictionId: string | undefined
): FocusSuggestion[] => {
  const suggestions: FocusSuggestion[] = [];
  const focus = addictions.find(addiction => addiction.id === focusAddictionId) ?? addictions[0];

  if (focus) {
    const plans = getPlans(focus);
    const stats = getPlanStats(focus);

    // The most frequent trigger with nothing planned for it is the clearest gap.
    const uncovered = getTopTriggers(focus, { limit: 3 }).find(
      trigger => !plans.some(plan => (plan.triggers ?? []).includes(trigger.tag))
    );
    if (uncovered) {
      suggestions.push({
        id: `plan-${uncovered.tag}`,
        key: 'suggestPlanForTrigger',
        params: {},
        translate: { trigger: `trigger_${uncovered.tag}` },
        plan: { addictionId: focus.id, triggers: [uncovered.tag] }
      });
    }

    const struggling = plans.find(plan => {
      const entry = stats.get(plan.id);
      return entry ? isStruggling(entry) : false;
    });
    if (struggling) {
      suggestions.push({
        id: `fix-${struggling.id}`,
        key: 'suggestChangePlan',
        params: { action: struggling.action }
      });
    }

    const need = summary.need;
    if (need) {
      const altKey = getAlternativeKeys(need.need)[0];
      suggestions.push({
        id: `need-${need.need}`,
        key: 'suggestMeetNeed',
        params: {},
        translate: { need: `needPhrase_${need.need}`, alternative: altKey },
        plan: {
          addictionId: focus.id,
          triggers: need.trigger ? [need.trigger] : undefined,
          cueKey: `need_${need.need}`,
          actionKey: altKey
        }
      });
    }

    const window = getRiskWindows([focus], { limit: 1 })[0] as RiskWindow | undefined;
    if (window) {
      suggestions.push({
        id: `window-${window.weekday}-${window.hour}`,
        key: 'suggestPrepareWindow',
        params: { time: `${String(window.hour).padStart(2, '0')}:00` },
        translate: { day: WEEKDAY_KEYS[window.weekday] }
      });
    }
  }

  if (summary.intentionsSet < 4) {
    suggestions.push({ id: 'intentions', key: 'suggestDailyIntention', params: {} });
  }

  if (summary.checkInDays < 4) {
    suggestions.push({ id: 'check-ins', key: 'suggestCheckInDaily', params: {} });
  }

  if (summary.bestPlan) {
    suggestions.push({
      id: 'best-plan',
      key: 'suggestKeepBestPlan',
      params: { action: summary.bestPlan.action }
    });
  }

  return suggestions.slice(0, 4);
};

export const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
