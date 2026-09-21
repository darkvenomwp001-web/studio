'use client';

import Image from 'next/image';
import type { ReadingListItem } from '@/types';
import { useStoryPreview } from '@/context/StoryPreviewProvider';
import { cn } from '@/lib/utils';

interface YourStoryCardProps {
  story: ReadingListItem;
}

export default function YourStoryCard({ story }: YourStoryCardProps) {
  const { onOpen } = useStoryPreview();
  
  // Immersive Progress protocol: Randomized for demonstration, visually accurate
  const mockProgress = Math.floor(Math.random() * 80) + 10; 
  const totalChapters = story.chapters?.length || 1;
  const currentChapterMock = Math.min(totalChapters, Math.floor(Math.random() * totalChapters) + 1);
  const statusText = totalChapters > 0 ? `Part ${currentChapterMock}` : "Start";

  return (
      <div 
        onClick={() => onOpen(story.id)} 
        className="flex-shrink-0 w-full group cursor-pointer animate-in fade-in zoom-in-95 duration-500 transform-gpu active:scale-95 transition-all"
      >
        <div className="aspect-[2/3] relative rounded-[1.5rem] overflow-hidden shadow-md group-hover:shadow-2xl group-hover:shadow-primary/10 transition-all duration-500 bg-muted border border-border/40">
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            className="group-hover:scale-110 transition-transform duration-1000 ease-in-out"
            data-ai-hint="book cover"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-white text-[9px] font-black uppercase tracking-widest">
                <span>Reading</span>
                <span className="opacity-60">{mockProgress}%</span>
            </div>
            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden shadow-inner">
                <div 
                    className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-1000" 
                    style={{ width: `${mockProgress}%` }} 
                />
            </div>
          </div>
        </div>
        <div className="mt-3 px-1 space-y-0.5">
            <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate leading-tight">
                {story.title}
            </h4>
            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60">
                Continue {statusText}
            </p>
        </div>
      </div>
  );
}
