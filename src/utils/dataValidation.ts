// Data validation utilities to prevent NaN and invalid data issues

import { CopingPlan, RelapseEntry, TRIGGER_TAGS, TriggerTag, UrgeEntry } from '../types';

export const validateNumber = (value: any, fallback: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }
  return fallback;
};

export const validateDate = (date: any): Date => {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return new Date(); // Return current date as fallback
  }
  return dateObj;
};

// Same as validateDate, but keeps "not set" distinguishable from "invalid":
// used for optional fields where falling back to "now" would be misleading.
export const validateOptionalDate = (date: unknown): Date | undefined => {
  if (typeof date !== 'string' && typeof date !== 'number' && !(date instanceof Date)) {
    return undefined;
  }
  const dateObj = new Date(date);
  return isNaN(dateObj.getTime()) ? undefined : dateObj;
};

// Entries created before ids existed still need a stable identity so they can
// be edited or deleted individually.
export const createEntryId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createRelapseId = (): string => createEntryId('relapse');
export const createUrgeId = (): string => createEntryId('urge');
export const createCopingPlanId = (): string => createEntryId('plan');

export const validateString = (value: any, fallback: string = ''): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
};

// Optional counterpart to validateString: keeps "" out of stored entries so an
// empty note never renders as a blank line in the history.
const validateOptionalString = (value: unknown): string | undefined => {
  const trimmed = validateString(value);
  return trimmed.length > 0 ? trimmed : undefined;
};

const isTriggerTag = (value: unknown): value is TriggerTag => {
  return typeof value === 'string' && (TRIGGER_TAGS as readonly string[]).includes(value);
};

// Unknown tags from an older/newer build are dropped rather than kept, so the
// rest of the app can rely on every stored tag having a label and a colour.
export const validateTriggerTags = (value: unknown): TriggerTag[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const tags = Array.from(new Set(value.filter(isTriggerTag)));
  return tags.length > 0 ? tags : undefined;
};

const validateIntensity = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.min(5, Math.max(1, Math.round(parsed)));
};

export const validateGoal = (goal: any) => {
  if (!goal || typeof goal !== 'object') {
    return {
      type: 'time' as const,
      value: 1,
      unit: 'days' as const
    };
  }
  
  return {
    type: goal.type === 'money' ? 'money' as const : 'time' as const,
    value: validateNumber(goal.value, 1),
    unit: goal.unit || 'days' as const
  };
};

// Stored entries arrive from localStorage, a backup file or the sync payload,
// so every field is treated as unknown until it has been through a validator.
const asRecord = (value: unknown): Record<string, unknown> => (
  value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
);

const sanitizeRelapseEntry = (value: unknown): RelapseEntry => {
  const note = asRecord(value);
  return {
    id: validateString(note.id) || createRelapseId(),
    date: validateDate(note.date),
    text: validateString(note.text),
    precededBy: validateOptionalString(note.precededBy),
    triggers: validateTriggerTags(note.triggers),
    urgeId: validateOptionalString(note.urgeId),
    previousLastEngaged: validateOptionalDate(note.previousLastEngaged)
  };
};

const sanitizeUrgeEntry = (value: unknown): UrgeEntry => {
  const urge = asRecord(value);
  const secondsHeld = Number(urge.secondsHeld);

  return {
    id: validateString(urge.id) || createUrgeId(),
    date: validateDate(urge.date),
    // Anything that is not explicitly a relapse counts as resisted: an urge the
    // user bothered to log and never marked as a slip is a win, not a loss.
    outcome: urge.outcome === 'relapsed' ? 'relapsed' : 'resisted',
    intensity: validateIntensity(urge.intensity),
    triggers: validateTriggerTags(urge.triggers),
    text: validateOptionalString(urge.text),
    secondsHeld: Number.isFinite(secondsHeld) ? Math.max(0, Math.round(secondsHeld)) : undefined,
    source: urge.source === 'panic' ? 'panic' : 'manual',
    relapseId: validateOptionalString(urge.relapseId)
  };
};

const sanitizeCopingPlan = (value: unknown): CopingPlan => {
  const plan = asRecord(value);
  return {
    id: validateString(plan.id) || createCopingPlanId(),
    cue: validateString(plan.cue),
    action: validateString(plan.action)
  };
};

export const sanitizeAddictionData = (data: any) => {
  return {
    ...data,
    cost: validateNumber(data.cost, 0),
    name: validateString(data.name, 'Unknown Addiction'),
    icon: validateString(data.icon, '🚫'),
    costType: ['money', 'time', 'health'].includes(data.costType) ? data.costType : 'money',
    lastEngaged: validateDate(data.lastEngaged),
    createdAt: validateDate(data.createdAt),
    goal: validateGoal(data.goal),
    note: validateString(data.note),
    notes: Array.isArray(data.notes) ? data.notes.map(sanitizeRelapseEntry) : [],
    urges: Array.isArray(data.urges) ? data.urges.map(sanitizeUrgeEntry) : [],
    // A plan with neither half filled in carries no meaning, so it is dropped
    // instead of surfacing as an empty row on the panic screen.
    copingPlans: Array.isArray(data.copingPlans)
      ? (data.copingPlans as unknown[]).map(sanitizeCopingPlan).filter(plan => plan.cue || plan.action)
      : []
  };
};
