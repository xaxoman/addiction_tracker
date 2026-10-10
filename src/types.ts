// Structured trigger vocabulary shared by urges and relapses. Free text is
// still allowed alongside it, but the tags are what makes "your top trigger is
// X" (and the risk windows behind the nudges) computable.
export const TRIGGER_TAGS = [
  'stress',
  'boredom',
  'social',
  'alone',
  'tired',
  'anxious',
  'sad',
  'angry',
  'celebrating',
  'afterWork',
  'afterMeal',
  'hungry'
] as const;

export type TriggerTag = (typeof TRIGGER_TAGS)[number];

// What the urge was trying to get. Triggers describe the situation; the need is
// the function the habit served in it, which is what a replacement has to meet
// for the craving to actually go away.
export const NEED_TAGS = [
  'relief',
  'distraction',
  'reward',
  'energy',
  'connection',
  'sleep'
] as const;

export type NeedTag = (typeof NEED_TAGS)[number];

// The answer to "did it go the way you meant it to?", shared by the daily
// intention and the weekly focus.
export type FollowThrough = 'yes' | 'partly' | 'no';

// A single recorded relapse. `previousLastEngaged` snapshots the streak anchor
// that was in place before this relapse was recorded, so deleting an entry that
// was added by mistake can restore the streak exactly as it was.
export interface RelapseEntry {
  id: string;
  date: Date;
  text?: string;
  // Debrief: what was going on just before the slip.
  precededBy?: string;
  // Debrief: where the slip happened. Optional on the type because entries
  // recorded before this field existed simply do not carry one; the relapse
  // form itself requires it for everything logged from now on.
  location?: string;
  triggers?: TriggerTag[];
  needs?: NeedTag[];
  // Debrief: what the user will do differently next time. Every slip ends on
  // this, and by default it is saved as an if-then plan (`planCreatedId`).
  nextTime?: string;
  planCreatedId?: string;
  // Set when the slip was logged from a craving that was tracked as an urge,
  // so the two entries can be kept in step when either one is deleted.
  urgeId?: string;
  previousLastEngaged?: Date;
}

// A craving the user recorded, whichever way it ended. Resisted urges are the
// wins the app had no way of storing before: they give relapse counts an honest
// denominator ("you beat 19 of 21 urges") instead of only counting failures.
export interface UrgeEntry {
  id: string;
  date: Date;
  outcome: 'resisted' | 'relapsed';
  // Self-reported peak intensity, 1-5. Optional: the panic screen never blocks
  // the exit on filling this in.
  intensity?: number;
  triggers?: TriggerTag[];
  needs?: NeedTag[];
  text?: string;
  // The if-then plan the user says they used. Counting these against the
  // outcome is what turns "my plans" into "the plans that work for me".
  planId?: string;
  // How long the user stayed with the craving before leaving the panic screen.
  secondsHeld?: number;
  source?: 'panic' | 'manual';
  // Set when the urge ended in a relapse, pointing at the RelapseEntry it created.
  relapseId?: string;
}

// Implementation intention: "if <cue>, I will <action>". Surfaced on the panic
// screen, where a pre-made decision beats improvising one mid-craving.
export interface CopingPlan {
  id: string;
  cue: string;
  action: string;
  // The situations this plan is for. The panic screen puts the plans whose
  // triggers match what is happening right now first.
  triggers?: TriggerTag[];
}

export interface Addiction {
  id: string;
  name: string;
  icon: string;
  cost: number;
  costType: 'money' | 'time' | 'health';
  lastEngaged: Date;
  createdAt: Date;
  goal: {
    type: 'time' | 'money';
    value: number;
    unit?: 'hours' | 'days' | 'weeks' | 'months' | 'dollars';
  };
  // Free-form note about the habit itself (motivation, triggers, plan...).
  note?: string;
  // Recorded relapses, in the order they were logged.
  notes?: RelapseEntry[];
  // Recorded urges, in the order they were logged.
  urges?: UrgeEntry[];
  copingPlans?: CopingPlan[];
}

export type ThemeMode = 'light' | 'dark';

// One self-report per calendar day. Relapses and urges are spiky and only
// appear when something goes wrong; a daily tick gives a continuous series to
// read them against, and a reason to open the app on a day when nothing
// happened.
export interface DailyCheckIn {
  // Local calendar day as "YYYY-MM-DD". One entry per day: checking in again
  // replaces the day's entry rather than appending a second one.
  date: string;
  // 1 (rough) to 5 (good).
  mood: number;
  // 0 (no cravings at all) to 5 (constant).
  cravingIntensity: number;
  note?: string;
  recordedAt: Date;
}

// The morning half of the check-in: the moment today is most likely to go
// wrong and what the user will do about it. The evening half is `outcome`.
export interface DailyIntention {
  // Local calendar day as "YYYY-MM-DD", one intention per day.
  date: string;
  riskMoment: string;
  action: string;
  addictionId?: string;
  outcome?: FollowThrough;
  setAt: Date;
  reviewedAt?: Date;
}

// One weekly review: the single change the user chose to work on for the
// following week. `outcome` is filled in at the start of the next review.
export interface WeeklyReview {
  id: string;
  createdAt: Date;
  focus: string;
  addictionId?: string;
  outcome?: FollowThrough;
}

// Everything the user writes about themselves rather than about one habit.
export interface JournalData {
  checkIns: DailyCheckIn[];
  intentions: DailyIntention[];
  reviews: WeeklyReview[];
}
