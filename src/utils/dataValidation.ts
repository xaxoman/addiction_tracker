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
    notes: Array.isArray(data.notes) ? data.notes.map((note: any) => ({
      date: validateDate(note.date),
      text: validateString(note.text)
    })) : []
  };
};
