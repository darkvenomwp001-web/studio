
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ReadingListItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock } from 'lucide-react';
import { formatDate } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';

interface LibraryListItemCardProps {
  story: ReadingListItem;
}

export default function LibraryListItemCard({ story }: LibraryListItemCardProps) {
  const publishedChapters = story.chapters?.filter(ch => ch.status === 'Published') || [];
  const firstChapterId = publishedChapters[0]?.id;

  const getStatusBadgeClasses = (status?: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
      case 'Ongoing':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="w-full overflow-hidden shadow-lg hover:shadow-primary/10 transition-shadow">
      <div className="flex">
        <Link href={`/stories/${story.id}`} passHref className="block flex-shrink-0">
          <div className="relative w-28 h-40 sm:w-32 sm:h-48">
            <Image
              src={story.coverImageUrl || 'https://placehold.co/512x800.png'}
              alt={story.title}
              layout="fill"
              objectFit="cover"
              data-ai-hint={story.dataAiHint || "book cover"}
              className="hover:scale-105 transition-transform"
            />
          </div>
        </Link>
        <CardContent className="p-4 flex flex-col justify-between flex-grow">
          <div>
            <div className="flex justify-between items-start">
               <Link href={`/stories/${story.id}`} passHref>
                <h3 className="font-headline text-lg sm:text-xl font-bold hover:underline line-clamp-1">{story.title}</h3>
              </Link>
              {story.status && <Badge variant="outline" className={cn("text-xs capitalize", getStatusBadgeClasses(story.status))}>{story.status}</Badge>}
            </div>
            {story.author && <p className="text-sm text-muted-foreground mb-2">by {story.author.displayName || story.author.username}</p>}
            
            <div className="flex items-center text-xs text-muted-foreground mb-4 gap-4">
              <div className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{publishedChapters.length} Parts</span>
              </div>
              {story.lastUpdated && 
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Updated {formatDate(story.lastUpdated)}</span>
                </div>
              }
            </div>
          </div>
          <div className="flex items-center gap-2 mt-auto">
             {firstChapterId ? (
                <Link href={`/stories/${story.id}/read/${firstChapterId}`} passHref>
                    <Button size="sm">Continue Reading</Button>
                </Link>
             ) : (
                <Link href={`/stories/${story.id}`} passHref>
                    <Button size="sm">View Story</Button>
                </Link>
             )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
