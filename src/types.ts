// A single recorded relapse. `previousLastEngaged` snapshots the streak anchor
// that was in place before this relapse was recorded, so deleting an entry that
// was added by mistake can restore the streak exactly as it was.
export interface RelapseEntry {
  id: string;
  date: Date;
  text?: string;
  previousLastEngaged?: Date;
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
}

export type ThemeMode = 'light' | 'dark';
