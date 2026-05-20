'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DynamicIslandType = 'notification' | 'success' | 'info' | 'error';

export interface DynamicIslandMessage {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  type?: DynamicIslandType;
  image?: string;
}

interface DynamicIslandContextType {
  showIsland: (message: Omit<DynamicIslandMessage, 'id'>) => void;
  activeMessage: DynamicIslandMessage | null;
}

const DynamicIslandContext = createContext<DynamicIslandContextType | undefined>(undefined);

export function DynamicIslandProvider({ children }: { children: ReactNode }) {
  const [activeMessage, setActiveMessage] = useState<DynamicIslandMessage | null>(null);

  const showIsland = useCallback((message: Omit<DynamicIslandMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setActiveMessage({ ...message, id });
    
    // Smooth auto-dismiss protocol
    setTimeout(() => {
      setActiveMessage(prev => prev?.id === id ? null : prev);
    }, 4500);
  }, []);

  return (
    <DynamicIslandContext.Provider value={{ showIsland, activeMessage }}>
      {children}
    </DynamicIslandContext.Provider>
  );
}

export function useDynamicIsland() {
  const context = useContext(DynamicIslandContext);
  if (!context) throw new Error('useDynamicIsland must be used within DynamicIslandProvider');
  return context;
}
