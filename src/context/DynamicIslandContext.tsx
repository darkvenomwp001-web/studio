'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';

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

/**
 * DynamicIslandProvider now bridges into the global Toast system.
 * This ensures all popups use the unified high-fidelity Dynamic Island design.
 */
export function DynamicIslandProvider({ children }: { children: ReactNode }) {
  const showIsland = useCallback((message: Omit<DynamicIslandMessage, 'id'>) => {
    toast({
      title: message.title,
      description: message.description,
      // @ts-ignore - passing extra props to our enhanced Toaster
      image: message.image,
      icon: message.icon,
      type: message.type,
      variant: message.type === 'error' ? 'destructive' : 'default',
    });
  }, []);

  return (
    <DynamicIslandContext.Provider value={{ showIsland, activeMessage: null }}>
      {children}
    </DynamicIslandContext.Provider>
  );
}

export function useDynamicIsland() {
  const context = useContext(DynamicIslandContext);
  if (!context) throw new Error('useDynamicIsland must be used within DynamicIslandProvider');
  return context;
}
