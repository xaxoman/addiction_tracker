// Data validation utilities to prevent NaN and invalid data issues

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

// Relapse entries created before ids existed still need a stable identity so
// they can be edited or deleted individually.
export const createRelapseId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `relapse-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const validateString = (value: any, fallback: string = ''): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
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
    notes: Array.isArray(data.notes) ? data.notes.map((note: any) => ({
      id: validateString(note?.id) || createRelapseId(),
      date: validateDate(note?.date),
      text: validateString(note?.text),
      previousLastEngaged: validateOptionalDate(note?.previousLastEngaged)
    })) : []
  };
};
