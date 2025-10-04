
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Story } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Star, Sparkles, MessageSquare } from 'lucide-react'; // Added Sparkles
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useStoryPreview } from '@/context/StoryPreviewProvider';

interface StoryCardProps {
  story: Pick<Story, 'id' | 'title' | 'author' | 'coverImageUrl' | 'dataAiHint' | 'status' | 'summary' | 'tags' | 'rating' | 'views'>;
}

export default function StoryCard({ story }: StoryCardProps) {
  const { toast } = useToast();
  const { onOpen } = useStoryPreview();

  const getStatusBadgeClasses = (status?: 'Ongoing' | 'Completed' | 'Draft') => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
      case 'Ongoing':
        return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
      case 'Draft': // Should not typically be shown with this card on public pages
        return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600';
      default: 
        return 'bg-muted text-muted-foreground border-border';
    }
  };
  
  const handleMoodMatcherClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation();
    toast({
      title: "Mood Matcher (Coming Soon!)",
      description: "Tell us how you feel, and we'll find stories to match your vibe!",
    });
  };

  return (
    <div onClick={() => onOpen(story.id)}>
      <Card className="h-full flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300 ease-in-out cursor-pointer group bg-card">
        <CardHeader className="p-0 relative aspect-[2/3] overflow-hidden">
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
          {story.status && story.status !== 'Draft' && ( // Don't show draft badge here
            <Badge 
              variant={'outline'}
              className={cn(
                  "absolute top-2 right-2 text-xs px-2 py-0.5 font-semibold",
                  getStatusBadgeClasses(story.status)
              )}
            >
              {story.status}
            </Badge>
          )}
           <button
            onClick={handleMoodMatcherClick}
            aria-label="Mood Matcher"
            className="absolute top-2 left-2 z-10 p-1.5 bg-black/40 text-white rounded-full hover:bg-primary/70 transition-colors"
            title="Mood Matcher (Find similar vibes)"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="pt-4 flex-grow">
          <CardTitle className="text-lg font-headline leading-tight mb-1 group-hover:text-primary transition-colors">
            {story.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground mb-2">By {story.author.displayName || story.author.username}</p>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
            {story.summary}
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {story.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-1" title="Rating">
            <Star className="w-3.5 h-3.5 text-yellow-500" />
            <span>{story.rating?.toFixed(1) || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1" title="Views">
            <Eye className="w-3.5 h-3.5" />
            <span>{story.views ? (story.views / 1000).toFixed(1) + 'k' : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1" title="Comments">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{Math.floor(Math.random() * 100)}</span> 
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
