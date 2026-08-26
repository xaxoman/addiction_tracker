import React, { createContext, useContext, useState, useEffect } from 'react';
import { Addiction } from '../types';
import { sanitizeAddictionData } from '../utils/dataValidation';
import {
  addUrge,
  appendRelapse,
  deleteRelapseEntry,
  deleteUrgeEntry,
  RelapseDetails,
  UrgeInput
} from '../utils/addictionEntries';

export type { RelapseDetails, UrgeInput };

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

  const logUrge = (id: string, input: UrgeInput) => {
    updateOne(id, addiction => addUrge(addiction, input));
  };

  const deleteRelapse = (id: string, relapseId: string) => {
    updateOne(id, addiction => deleteRelapseEntry(addiction, relapseId));
  };

  const deleteUrge = (id: string, urgeId: string) => {
    updateOne(id, addiction => deleteUrgeEntry(addiction, urgeId));
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
