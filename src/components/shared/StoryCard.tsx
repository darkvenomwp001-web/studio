'use client';

import Image from 'next/image';
import type { Story } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
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
      className="group cursor-pointer flex flex-col space-y-3 animate-in fade-in duration-500"
    >
      {/* Optimized Cover Box */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-md transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:-translate-y-1 bg-muted">
        <Image
          src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
          alt={story.title}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          data-ai-hint={story.dataAiHint || "book cover art"}
        />
        
        {/* Overlay Stats - Visible on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
           <div className="flex items-center justify-between text-white text-[10px] font-bold tracking-tight">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {(story.views || 0).toLocaleString()}</span>
              <span className="flex items-center gap-1 text-yellow-400"><Star className="h-3 w-3 fill-yellow-400" /> {story.rating?.toFixed(1) || '4.8'}</span>
           </div>
        </div>
      </div>

      {/* Refined Metadata Area */}
      <div className="space-y-1 px-0.5">
        <h3 className="font-headline font-bold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {story.title}
        </h3>
        <p className="text-[11px] text-muted-foreground font-semibold truncate uppercase tracking-tight">
          @{story.author.username}
        </p>
        
        <div className="flex items-center gap-2 pt-1">
           <span className="text-[10px] font-bold uppercase tracking-widest text-accent/80">{story.genre || 'Story'}</span>
           <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
           <span className={cn(
             "text-[10px] font-bold uppercase tracking-widest",
             story.status === 'Completed' ? "text-green-500" : "text-primary"
           )}>{story.status || 'Ongoing'}</span>
        </div>
      </div>
    </div>
  );
}
