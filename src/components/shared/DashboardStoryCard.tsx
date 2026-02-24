'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Story } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit2, BookOpen, Star, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

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
    <div className="w-full group">
        <div className="aspect-[2/3] relative rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-muted">
            <Link href={`/stories/${story.id}`} passHref>
                <Image
                    src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
                    alt={story.title}
                    layout="fill"
                    objectFit="cover"
                    className="group-hover:scale-105 transition-transform duration-300 ease-in-out cursor-pointer"
                    data-ai-hint={story.dataAiHint || "book cover"}
                />
            </Link>
            <div className="absolute top-2 right-2 flex flex-col gap-2">
                <Badge variant="outline" className={cn("text-[10px] capitalize h-fit self-end", getStatusBadgeClasses(story.status, story.visibility))}>
                    {displayStatus}
                </Badge>
            </div>
             <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                 <div className="flex items-center text-xs text-white/80 gap-x-3 gap-y-1 flex-wrap">
                    <div className="flex items-center gap-1" title="Chapters">
                        <BookOpen className="h-3 w-3" />
                        <span>{story.chapters.length}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Views">
                        <Eye className="h-3 w-3" />
                        <span>{(story.views || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Votes">
                        <Star className="h-3 w-3" />
                        <span>{totalVotes.toLocaleString()}</span>
                    </div>
                 </div>
            </div>
        </div>
        <div className="mt-2">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                     <Link href={`/write/edit-details?storyId=${story.id}`} className="font-semibold text-sm hover:underline line-clamp-1">
                        {story.title}
                     </Link>
                     {isCollaborator && (
                        <p className="text-xs text-muted-foreground">by @{story.author.username}</p>
                    )}
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                         <Link href={`/write/edit-details?storyId=${story.id}`} passHref>
                            <DropdownMenuItem><Edit2 className="mr-2 h-4 w-4"/>Manage</DropdownMenuItem>
                         </Link>
                         <Link href={`/stories/${story.id}`} passHref>
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4"/>View Story</DropdownMenuItem>
                         </Link>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    </div>
  );
}
