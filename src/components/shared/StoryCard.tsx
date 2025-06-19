import Link from 'next/link';
import Image from 'next/image';
import type { Story } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Star, MessageSquare } from 'lucide-react';

interface StoryCardProps {
  story: Story;
}

export default function StoryCard({ story }: StoryCardProps) {
  return (
    <Link href={`/stories/${story.id}`} passHref>
      <Card className="h-full flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300 ease-in-out cursor-pointer group">
        <CardHeader className="p-0 relative aspect-[2/3] overflow-hidden">
          <Image
            src={story.coverImageUrl || `https://placehold.co/300x450.png/E0E7FF/1C3D5A?text=${encodeURIComponent(story.title)}`}
            alt={story.title}
            width={300}
            height={450}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300 ease-in-out"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
          {story.status === 'Completed' && (
            <Badge variant="secondary" className="absolute top-2 right-2 bg-accent text-accent-foreground">{story.status}</Badge>
          )}
        </CardHeader>
        <CardContent className="pt-4 flex-grow">
          <CardTitle className="text-lg font-headline leading-tight mb-1 group-hover:text-primary transition-colors">
            {story.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground mb-2">By {story.author.username}</p>
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
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            <span>{story.rating?.toFixed(1) || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{story.views ? (story.views / 1000).toFixed(1) + 'k' : 'N/A'}</span>
          </div>
           {/* Placeholder for comments count */}
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{Math.floor(Math.random() * 100)}</span> 
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
