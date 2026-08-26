import React, { createContext, useContext, useState, useEffect } from 'react';
import { Addiction, RelapseEntry, TriggerTag, UrgeEntry } from '../types';
import { createRelapseId, createUrgeId, sanitizeAddictionData } from '../utils/dataValidation';

// Everything the relapse dialog (and the panic screen's "I used" exit) can
// record beyond the timestamp itself.
export interface RelapseDetails {
  text?: string;
  precededBy?: string;
  triggers?: TriggerTag[];
}

export interface UrgeInput {
  date?: Date;
  outcome: 'resisted' | 'relapsed';
  intensity?: number;
  triggers?: TriggerTag[];
  text?: string;
  secondsHeld?: number;
  source?: 'panic' | 'manual';
  // Only read when `outcome` is 'relapsed': the paired relapse entry is written
  // in the same update so the two can never drift apart.
  relapse?: RelapseDetails;
}

type AddictionContextType = {
  addictions: Addiction[];
  addAddiction: (addiction: Omit<Addiction, 'id' | 'createdAt'>) => void;
  removeAddiction: (id: string) => void;
  updateAddiction: (updatedAddiction: Addiction) => void;
  resetLastEngaged: (id: string, date: Date, details?: RelapseDetails) => void;
  deleteRelapse: (id: string, relapseId: string) => void;
  logUrge: (id: string, input: UrgeInput) => void;
  deleteUrge: (id: string, urgeId: string) => void;
  reorderAddictions: (startIndex: number, endIndex: number) => void;
  replaceAddictions: (nextAddictions: Addiction[]) => void;
};

const AddictionContext = createContext<AddictionContextType | undefined>(undefined);

// Appends a relapse and moves the streak anchor to it. `previousLastEngaged`
// remembers the anchor it replaced so the entry can be undone later.
const appendRelapse = (
  addiction: Addiction,
  date: Date,
  details: RelapseDetails | undefined,
  extra: Partial<RelapseEntry> = {}
): { addiction: Addiction; relapse: RelapseEntry } => {
  const relapse: RelapseEntry = {
    id: createRelapseId(),
    date,
    text: details?.text,
    precededBy: details?.precededBy,
    triggers: details?.triggers,
    previousLastEngaged: new Date(addiction.lastEngaged),
    ...extra
  };

  return {
    addiction: {
      ...addiction,
      lastEngaged: date,
      notes: [...(addiction.notes ?? []), relapse]
    },
    relapse
  };
};

// Removes a relapse and restores the streak anchor it replaced. Only the most
// recently logged relapse drives the current streak, so removing an older entry
// leaves `lastEngaged` untouched. When it is the latest one, restore the anchor
// it replaced (falling back to the previous entry, then to the tracker's
// creation date for data written before anchors were stored).
const removeRelapse = (addiction: Addiction, relapseId: string): Addiction => {
  const notes = addiction.notes ?? [];
  const index = notes.findIndex(note => note.id === relapseId);
  if (index === -1) {
    return addiction;
  }

  const removed = notes[index];
  const remaining = notes.filter((_, noteIndex) => noteIndex !== index);

  const isMostRecent = index === notes.length - 1;
  const fallback = remaining.length > 0
    ? remaining[remaining.length - 1].date
    : addiction.createdAt;
  const restoredAnchor = removed.previousLastEngaged ?? fallback;

  return {
    ...addiction,
    notes: remaining,
    lastEngaged: isMostRecent ? new Date(restoredAnchor) : addiction.lastEngaged
  };
};

const removeUrge = (addiction: Addiction, urgeId: string): Addiction => ({
  ...addiction,
  urges: (addiction.urges ?? []).filter(urge => urge.id !== urgeId)
});

export const AddictionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [addictions, setAddictions] = useState<Addiction[]>(() => {
    const savedAddictions = localStorage.getItem('addictions');
    if (savedAddictions) {
      try {
        const parsed = JSON.parse(savedAddictions);
        return parsed.map((addiction: any) => sanitizeAddictionData({
          ...addiction,
          id: addiction.id || crypto.randomUUID()
        }));
      } catch (error) {
        console.error('Error parsing saved addictions:', error);
        // Clear corrupted data
        localStorage.removeItem('addictions');
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('addictions', JSON.stringify(addictions));
    } catch (error) {
      console.error('Error saving addictions to localStorage:', error);
    }
  }, [addictions]);

  // Applies `update` to one tracker and leaves the rest of the list untouched.
  const updateOne = (id: string, update: (addiction: Addiction) => Addiction) => {
    setAddictions(prev => prev.map(addiction => (
      addiction.id === id ? update(addiction) : addiction
    )));
  };

  const addAddiction = (addiction: Omit<Addiction, 'id' | 'createdAt'>) => {
    const newAddiction: Addiction = {
      ...addiction,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      cost: typeof addiction.cost === 'number' ? addiction.cost : parseFloat(String(addiction.cost)) || 0,
      goal: addiction.goal ? {
        ...addiction.goal,
        value: typeof addiction.goal.value === 'number' ? addiction.goal.value : parseFloat(String(addiction.goal.value)) || 0
      } : addiction.goal
    };
    setAddictions(prev => [...prev, newAddiction]);
  };

  const removeAddiction = (id: string) => {
    setAddictions(prev => prev.filter(addiction => addiction.id !== id));
  };

  const updateAddiction = (updatedAddiction: Addiction) => {
    const sanitizedAddiction = {
      ...updatedAddiction,
      cost: typeof updatedAddiction.cost === 'number' ? updatedAddiction.cost : parseFloat(String(updatedAddiction.cost)) || 0,
      goal: updatedAddiction.goal ? {
        ...updatedAddiction.goal,
        value: typeof updatedAddiction.goal.value === 'number' ? updatedAddiction.goal.value : parseFloat(String(updatedAddiction.goal.value)) || 0
      } : updatedAddiction.goal
    };
    
    setAddictions(prev => 
      prev.map(addiction => 
        addiction.id === sanitizedAddiction.id ? sanitizedAddiction : addiction
      )
    );
  };

  const resetLastEngaged = (id: string, date: Date, details?: RelapseDetails) => {
    updateOne(id, addiction => appendRelapse(addiction, date, details).addiction);
  };

  // Records a craving. A resisted urge is stored on its own; one that ended in
  // a slip also writes the relapse (and moves the streak anchor) in the same
  // update, with the two entries pointing at each other.
  const logUrge = (id: string, input: UrgeInput) => {
    updateOne(id, addiction => {
      const date = input.date ?? new Date();
      const urge: UrgeEntry = {
        id: createUrgeId(),
        date,
        outcome: input.outcome,
        intensity: input.intensity,
        triggers: input.triggers,
        text: input.text,
        secondsHeld: input.secondsHeld,
        source: input.source ?? 'manual'
      };

      if (input.outcome !== 'relapsed') {
        return { ...addiction, urges: [...(addiction.urges ?? []), urge] };
      }

      const { addiction: withRelapse, relapse } = appendRelapse(
        addiction,
        date,
        // Fall back to the urge's own triggers/note so the slip carries the
        // context the user already gave on the panic screen.
        {
          text: input.relapse?.text ?? input.text,
          precededBy: input.relapse?.precededBy,
          triggers: input.relapse?.triggers ?? input.triggers
        },
        { urgeId: urge.id }
      );

      return {
        ...withRelapse,
        urges: [...(withRelapse.urges ?? []), { ...urge, relapseId: relapse.id }]
      };
    });
  };

  // A relapse logged from the panic screen and the urge that produced it were a
  // single action for the user, so deleting either one removes the pair.
  const deleteRelapse = (id: string, relapseId: string) => {
    updateOne(id, addiction => {
      const linkedUrge = (addiction.urges ?? []).find(urge => urge.relapseId === relapseId);
      const withoutRelapse = removeRelapse(addiction, relapseId);
      return linkedUrge ? removeUrge(withoutRelapse, linkedUrge.id) : withoutRelapse;
    });
  };

  const deleteUrge = (id: string, urgeId: string) => {
    updateOne(id, addiction => {
      const urge = (addiction.urges ?? []).find(entry => entry.id === urgeId);
      const withoutUrge = removeUrge(addiction, urgeId);
      return urge?.relapseId ? removeRelapse(withoutUrge, urge.relapseId) : withoutUrge;
    });
  };

  const reorderAddictions = (startIndex: number, endIndex: number) => {
    const result = [...addictions];
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setAddictions(result);
  };

  const replaceAddictions = (nextAddictions: Addiction[]) => {
    const sanitized = nextAddictions.map((addiction) => sanitizeAddictionData({
      ...addiction,
      id: addiction.id || crypto.randomUUID()
    }));
    setAddictions(sanitized);
  };

  return (
    <AddictionContext.Provider 
      value={{ 
        addictions, 
        addAddiction, 
        removeAddiction, 
        updateAddiction, 
        resetLastEngaged,
        deleteRelapse,
        logUrge,
        deleteUrge,
        reorderAddictions,
        replaceAddictions
      }}
    >
      {children}
    </AddictionContext.Provider>
  );
};

export const useAddictions = (): AddictionContextType => {
  const context = useContext(AddictionContext);
  if (context === undefined) {
    throw new Error('useAddictions must be used within an AddictionProvider');
  }
  return context;
};
