import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  CloudSession,
  loginToCloud,
  persistSession,
  readStoredSession,
  registerCloudAccount
} from '../services/cloudSync';

type AuthContextType = {
  session: CloudSession | null;
  login: (email: string, password: string) => Promise<CloudSession>;
  register: (email: string, password: string) => Promise<CloudSession>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<CloudSession | null>(() => readStoredSession());

  const value = useMemo<AuthContextType>(() => {
    const applySession = (nextSession: CloudSession) => {
      persistSession(nextSession);
      setSession(nextSession);
      return nextSession;
    };

    return {
      session,
      login: async (email, password) => applySession(await loginToCloud(email, password)),
      register: async (email, password) => applySession(await registerCloudAccount(email, password)),
      logout: () => {
        persistSession(null);
        setSession(null);
      }
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
