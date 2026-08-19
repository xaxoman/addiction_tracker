import React, { createContext, useContext, useState, useEffect } from 'react';
import { Addiction } from '../types';
import { createRelapseId, sanitizeAddictionData } from '../utils/dataValidation';

type AddictionContextType = {
  addictions: Addiction[];
  addAddiction: (addiction: Omit<Addiction, 'id' | 'createdAt'>) => void;
  removeAddiction: (id: string) => void;
  updateAddiction: (updatedAddiction: Addiction) => void;
  resetLastEngaged: (id: string, date: Date, note?: string) => void;
  deleteRelapse: (id: string, relapseId: string) => void;
  reorderAddictions: (startIndex: number, endIndex: number) => void;
  replaceAddictions: (nextAddictions: Addiction[]) => void;
};

const AddictionContext = createContext<AddictionContextType | undefined>(undefined);

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

  const resetLastEngaged = (id: string, date: Date, note?: string) => {
    setAddictions(prev => 
      prev.map(addiction => 
        addiction.id === id 
          ? { 
              ...addiction, 
              lastEngaged: date,
              notes: [
                ...(addiction.notes ?? []),
                {
                  id: createRelapseId(),
                  date,
                  text: note,
                  // Remember the streak anchor this relapse replaced so the
                  // entry can be undone later if it was logged by mistake.
                  previousLastEngaged: new Date(addiction.lastEngaged)
                }
              ]
            } 
          : addiction
      )
    );
  };

  const deleteRelapse = (id: string, relapseId: string) => {
    setAddictions(prev =>
      prev.map(addiction => {
        if (addiction.id !== id) {
          return addiction;
        }

        const notes = addiction.notes ?? [];
        const index = notes.findIndex(note => note.id === relapseId);
        if (index === -1) {
          return addiction;
        }

        const removed = notes[index];
        const remaining = notes.filter((_, noteIndex) => noteIndex !== index);

        // Only the most recently logged relapse drives the current streak, so
        // removing an older entry leaves `lastEngaged` untouched. When it is the
        // latest one, restore the anchor it replaced (falling back to the
        // previous entry, then to the tracker's creation date for old data).
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
      })
    );
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