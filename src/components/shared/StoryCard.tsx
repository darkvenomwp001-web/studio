'use client';

import NextImage from 'next/image';
import type { Story } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Star, Sparkles } from 'lucide-react';
import { cn, formatCompactNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useStoryPreview } from '@/context/StoryPreviewProvider';

interface StoryCardProps {
  story: Pick<Story, 'id' | 'title' | 'author' | 'coverImageUrl' | 'dataAiHint' | 'status' | 'summary' | 'tags' | 'rating' | 'views' | 'genre'>;
}

export default function StoryCard({ story }: StoryCardProps) {
  const { toast } = useToast();
  const { onOpen } = useStoryPreview();

  return (
    <div 
      onClick={() => onOpen(story.id)}
      className="group cursor-pointer flex flex-col space-y-1.5 animate-in fade-in duration-500"
    >
      {/* Optimized Compact Cover Box */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:shadow-primary/20 group-hover:-translate-y-1 bg-muted">
        <NextImage
          src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
          alt={story.title}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
          data-ai-hint={story.dataAiHint || "book cover art"}
        />
        
        {/* Overlay Stats - Compacted for High Density */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-1.5 md:p-2">
           <div className="flex items-center justify-between text-white text-[8px] md:text-[9px] font-black tracking-tighter">
              <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {formatCompactNumber(story.views || 0)}</span>
              <span className="flex items-center gap-0.5 text-yellow-400"><Star className="h-2.5 w-2.5 fill-yellow-400" /> {story.rating?.toFixed(1) || '4.8'}</span>
           </div>
        </div>
      </div>

      {/* Refined Metadata Area */}
      <div className="space-y-0.5 px-0.5">
        <h3 className="font-headline font-bold text-[10px] md:text-xs leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {story.title}
        </h3>
        <p className="text-[9px] md:text-[10px] text-muted-foreground font-bold truncate uppercase tracking-tighter opacity-80">
          @{story.author.username}
        </p>
        
        <div className="flex items-center gap-1 pt-0.5 opacity-60">
           <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-accent truncate max-w-[50%]">{story.genre || 'Story'}</span>
           <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30"></span>
           <span className={cn(
             "text-[7px] md:text-[8px] font-black uppercase tracking-widest",
             story.status === 'Completed' ? "text-green-500" : "text-primary"
           )}>{story.status || 'Ongoing'}</span>
        </div>
      </div>
    </div>
  );
}
