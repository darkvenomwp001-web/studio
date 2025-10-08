
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Story } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit2, BookOpen, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface DashboardStoryCardProps {
  story: Story;
}

export default function DashboardStoryCard({ story }: DashboardStoryCardProps) {
  const { user } = useAuth();

  const totalVotes = story.chapters?.reduce((acc, chapter) => acc + (chapter.votes || 0), 0) || 0;

  const getStatusBadgeClasses = (status?: Story['status'], visibility?: Story['visibility']) => {
    if (visibility === 'Private' || visibility === 'Unlisted') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-600';
    }
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
      case 'Ongoing':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
      case 'Draft':
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const displayStatus = story.visibility !== 'Public' ? story.visibility : (story.status || 'Draft');
  const isCollaborator = story.author.id !== user?.id;

  return (
      <Card className="w-full overflow-hidden shadow-sm hover:shadow-primary/10 transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row">
           <Link href={`/stories/${story.id}`} passHref className="block flex-shrink-0 sm:w-32">
            <div className="relative h-40 sm:h-full w-full sm:w-32 bg-muted">
              <Image
                src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
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
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <Link href={`/write/edit-details?storyId=${story.id}`} passHref>
                        <h3 className="font-headline text-lg sm:text-xl font-bold hover:underline line-clamp-2">{story.title}</h3>
                    </Link>
                     {isCollaborator && (
                        <p className="text-xs text-muted-foreground">by {story.author.displayName || story.author.username}</p>
                    )}
                </div>
                <Badge variant="outline" className={cn("text-xs capitalize h-fit ml-2", getStatusBadgeClasses(story.status, story.visibility))}>{displayStatus}</Badge>
              </div>

              <div className="flex items-center text-xs text-muted-foreground mb-4 gap-x-4 gap-y-1 flex-wrap">
                <div className="flex items-center gap-1.5" title="Chapters">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{story.chapters.length} Parts</span>
                </div>
                 <div className="flex items-center gap-1.5" title="Views">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{story.views?.toLocaleString() || 0}</span>
                </div>
                 <div className="flex items-center gap-1.5" title="Votes">
                  <Star className="h-3.5 w-3.5" />
                  <span>{totalVotes.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 hidden md:block">{story.summary || "No description provided."}</p>
            </div>
            
            <div className="flex items-center gap-2 mt-4">
                <Link href={`/write/edit-details?storyId=${story.id}`} passHref>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground"><Edit2 className="mr-1.5 h-4 w-4"/>Manage</Button>
                </Link>
                <Link href={`/stories/${story.id}`} passHref>
                    <Button size="sm" variant="outline"><Eye className="mr-1.5 h-4 w-4"/>View Story</Button>
                </Link>
            </div>
          </CardContent>
        </div>
      </Card>
  );
}

    