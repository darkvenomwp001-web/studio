'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ReadingListItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';
import { useStoryPreview } from '@/context/StoryPreviewProvider';

interface LibraryListItemCardProps {
  story: ReadingListItem;
}

export default function LibraryListItemCard({ story }: LibraryListItemCardProps) {
  const { onOpen } = useStoryPreview();
  const publishedChapters = story.chapters?.filter(ch => ch.status === 'Published') || [];
  const firstChapterId = publishedChapters[0]?.id;

  return (
    <Card className="w-full overflow-hidden border-border/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group rounded-[2rem] bg-card/60 backdrop-blur-sm">
      <div className="flex">
        <div onClick={() => onOpen(story.id)} className="block flex-shrink-0 cursor-pointer overflow-hidden">
          <div className="relative w-32 h-44 sm:w-40 sm:h-56 bg-muted group-hover:scale-105 transition-transform duration-700">
            <Image
              src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
              alt={story.title}
              layout="fill"
              objectFit="cover"
              data-ai-hint="book cover"
              className="object-cover"
            />
          </div>
        </div>
        <CardContent className="p-5 md:p-8 flex flex-col justify-between flex-grow min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2 gap-4">
               <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onOpen(story.id)}>
                <h3 className="text-xl md:text-2xl font-headline font-bold hover:text-primary transition-colors truncate">{story.title}</h3>
              </div>
              {story.status && (
                <Badge variant="outline" className={cn(
                    "text-[8px] uppercase font-black h-5 tracking-widest px-2.5 rounded-full border-none",
                    story.status === 'Completed' ? "bg-green-500 text-white" : "bg-primary text-white"
                )}>
                    {story.status}
                </Badge>
              )}
            </div>
            {story.author && <p className="text-sm font-bold text-muted-foreground/60 mb-6 uppercase tracking-tighter">@{story.author.username}</p>}
            
            <div className="flex flex-wrap items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 gap-6">
              <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{publishedChapters.length} Parts</span>
              </div>
              {story.lastUpdated && 
                <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Updated {formatDate(story.lastUpdated)}</span>
                </div>
              }
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
             {firstChapterId ? (
                <Link href={`/stories/${story.id}/read/${firstChapterId}`} className="flex-1 sm:flex-none">
                    <Button className="w-full sm:w-auto rounded-full px-8 h-11 font-bold shadow-lg shadow-primary/20 gap-2">
                        Continue Reading
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </Link>
             ) : (
                <Button variant="outline" className="rounded-full px-8 h-11 font-bold border-border/60" onClick={() => onOpen(story.id)}>View Overview</Button>
             )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
