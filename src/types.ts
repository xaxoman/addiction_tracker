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

// A single recorded relapse. `previousLastEngaged` snapshots the streak anchor
// that was in place before this relapse was recorded, so deleting an entry that
// was added by mistake can restore the streak exactly as it was.
export interface RelapseEntry {
  id: string;
  date: Date;
  text?: string;
  // Debrief: what was going on just before the slip.
  precededBy?: string;
  triggers?: TriggerTag[];
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
  text?: string;
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
