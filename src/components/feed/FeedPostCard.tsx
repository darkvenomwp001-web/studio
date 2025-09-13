'use client';

import { useState } from 'react';
import type { FeedPost, User } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { toggleLikePost } from '@/app/actions/feedActions';
import SpotifyPlayer from '../shared/SpotifyPlayer';

interface FeedPostCardProps {
  post: FeedPost;
  currentUser: User;
}

export default function FeedPostCard({ post, currentUser }: FeedPostCardProps) {
  const [isLiked, setIsLiked] = useState(post.likedBy.includes(currentUser.id));
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const { toast } = useToast();

  const handleLikeClick = async () => {
    // Optimistic UI update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    const result = await toggleLikePost(post.id, currentUser.id);
    if (!result.success) {
      // Revert UI on failure
      setIsLiked(isLiked);
      setLikesCount(likesCount);
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.id}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatarUrl} alt={post.author.displayName} data-ai-hint="profile person" />
              <AvatarFallback>{post.author.username?.substring(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <Link href={`/profile/${post.author.id}`} className="font-semibold hover:underline">
              {post.author.displayName}
            </Link>
            <p className="text-xs text-muted-foreground">
              {post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
            </p>
          </div>
        </div>

        {post.content && (
            <p className="text-foreground/90 whitespace-pre-line">
            {post.content}
            </p>
        )}

        {post.imageUrl && (
            <div className="rounded-lg overflow-hidden border">
                <Image src={post.imageUrl} alt="Post image" width={500} height={500} className="w-full h-auto object-contain" />
            </div>
        )}
        
        {post.songUrl && (
          <div className="space-y-2">
            {post.songLyricSnippet && (
              <blockquote className="border-l-2 pl-3 italic text-sm text-muted-foreground">
                "{post.songLyricSnippet}"
              </blockquote>
            )}
            <SpotifyPlayer trackUrl={post.songUrl} />
          </div>
        )}

        {post.storyId && post.storyTitle && (
          <Link href={`/stories/${post.storyId}`} className="block">
            <div className="border rounded-lg flex items-center gap-3 p-2 hover:bg-muted/50 transition-colors">
              <Image
                src={post.storyCoverUrl || 'https://placehold.co/512x800.png'}
                alt={post.storyTitle}
                width={40}
                height={60}
                className="rounded aspect-[2/3] object-cover bg-muted"
                data-ai-hint="book cover"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold leading-tight">{post.storyTitle}</p>
                <p className="text-xs text-muted-foreground">Attached Story</p>
              </div>
            </div>
          </Link>
        )}
      </CardContent>
      <CardFooter className="p-2 border-t flex items-center gap-2">
        <Button variant="ghost" size="sm" className="flex items-center gap-1.5" onClick={handleLikeClick}>
          <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
          <span className="text-sm">{likesCount}</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex items-center gap-1.5" onClick={() => toast({ title: 'Coming Soon!', description: 'Commenting on posts will be available in a future update.'})}>
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm">{post.commentsCount}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
