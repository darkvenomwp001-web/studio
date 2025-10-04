
'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface StoryPreviewContextType {
  storyId: string | null;
  isOpen: boolean;
  onOpen: (storyId: string) => void;
  onClose: () => void;
}

const StoryPreviewContext = createContext<StoryPreviewContextType | undefined>(undefined);

export function StoryPreviewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [storyId, setStoryId] = useState<string | null>(null);

  const onOpen = useCallback((id: string) => {
    setStoryId(id);
    setIsOpen(true);
  }, []);

  const onClose = useCallback(() => {
    setIsOpen(false);
    // We delay clearing the storyId to allow for exit animations
    setTimeout(() => {
        setStoryId(null);
    }, 300);
  }, []);

  return (
    <StoryPreviewContext.Provider value={{ isOpen, storyId, onOpen, onClose }}>
      {children}
    </StoryPreviewContext.Provider>
  );
}

export function useStoryPreview() {
  const context = useContext(StoryPreviewContext);
  if (context === undefined) {
    throw new Error('useStoryPreview must be used within a StoryPreviewProvider');
  }
  return context;
}
