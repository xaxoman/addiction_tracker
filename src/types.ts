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
  notes?: {
    date: Date;
    text?: string;
  }[];
}

export type ThemeMode = 'light' | 'dark';