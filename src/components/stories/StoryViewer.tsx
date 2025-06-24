'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { UserStory } from '@/types';
import { cn } from '@/lib/utils';

interface StoryViewerProps {
  stories: UserStory[];
  onClose: () => void;
}

const STORY_DURATION_MS = 5000; // 5 seconds for images

export default function StoryViewer({ stories, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  const activeStory = stories[currentIndex];

  const goToNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose(); // Close viewer when last story finishes
    }
  };

  const goToPrevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    setProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);

    const activeStory = stories[currentIndex];
    if (!activeStory) return;

    if (activeStory.mediaType === 'image') {
      timerRef.current = setTimeout(goToNextStory, STORY_DURATION_MS);
      // Animate progress bar for images
      const interval = setInterval(() => {
        setProgress(p => p + (100 / (STORY_DURATION_MS / 100)));
      }, 100);
      return () => {
        clearTimeout(timerRef.current);
        clearInterval(interval);
      };
    } else {
      // For video, progress is handled by onTimeUpdate
    }
  }, [currentIndex, stories]);
  
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
        const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(p);
    }
  };

  if (!activeStory) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-in fade-in-0" onClick={onClose}>
      <div 
        className="relative w-full max-w-md h-full max-h-[95vh] sm:max-h-[90vh] bg-neutral-900 rounded-lg overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                    className={cn("h-full bg-white rounded-full transition-all duration-100 ease-linear", 
                      index < currentIndex && 'w-full',
                      index === currentIndex && 'w-0'
                    )}
                    style={ index === currentIndex ? { width: `${progress}%` } : {} }
                ></div>
            </div>
          ))}
        </div>

        {/* Header */}
        <header className="absolute top-4 left-2 right-2 z-20 p-2 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={activeStory.userAvatarUrl} />
              <AvatarFallback>{activeStory.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{activeStory.username}</span>
              <span className="text-xs text-neutral-300">
                {formatDistanceToNow(activeStory.createdAt.toDate(), { addSuffix: true })}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2">
            <X className="h-6 w-6" />
          </button>
        </header>

        {/* Media Content */}
        <div className="flex-1 flex items-center justify-center">
          {activeStory.mediaType === 'image' ? (
            <Image 
              src={activeStory.mediaUrl} 
              alt={`Story from ${activeStory.username}`} 
              layout="fill" 
              objectFit="contain" 
            />
          ) : (
            <video 
              ref={videoRef}
              src={activeStory.mediaUrl} 
              autoPlay 
              playsInline 
              className="w-full h-full object-contain"
              onEnded={goToNextStory}
              onTimeUpdate={handleVideoTimeUpdate}
            />
          )}
        </div>

        {/* Navigation Controls */}
        <button onClick={goToPrevStory} disabled={currentIndex === 0} className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-1/3 z-30 disabled:hidden"></button>
        <button onClick={goToNextStory} className="absolute right-0 top-1/2 -translate-y-1/2 h-full w-1/3 z-30"></button>
      </div>
    </div>
  );
}
